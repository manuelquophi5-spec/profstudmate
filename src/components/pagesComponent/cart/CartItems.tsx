"use client";
import React, { useState } from "react";
import { FiBookmark, FiTrash2, FiBookOpen, FiMapPin, FiTruck } from "react-icons/fi";
import { useTranslation } from "@/hooks/useTranslation";
import {
  getCartData,
  removeCourseFromCart,
  removeCartItem,
  setCartData,
  updateCartItemWishlistStatus,
  updateFulfillment,
} from "@/redux/reducers/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import { removeFromCart } from "@/utils/api/user/get-cart/removeFromCart";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { FaBookmark, FaTag, FaCheckCircle } from "react-icons/fa";
import DataNotFound from "@/components/commonComp/DataNotFound";
import { removeCoupon } from "@/redux/reducers/couponSlice";
import Link from "next/link";
import { setIsCartPromoApplied } from "@/redux/reducers/helpersReducer";
import { getCurrencySymbol } from "@/utils/helpers";
import { getCartItems } from "@/utils/api/user/get-cart/getCart";
import CustomImageTag from "@/components/commonComp/customImage/CustomImageTag";
import { CampusLocation, DeliveryType } from "@/types/bookstore";

const CAMPUS_LOCATIONS: { id: CampusLocation; label: string; desc: string }[] = [
  { id: "Accra Main", label: "Accra Main Campus", desc: "ICAG Head Office Bookstore, Okponglo, Accra" },
  { id: "Kumasi", label: "Kumasi Regional Center", desc: "ICAG Ashanti Regional Office, Kumasi" },
  { id: "Takoradi", label: "Takoradi Regional Center", desc: "ICAG Western Regional Office, Takoradi" },
];

export default function CartItems() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { toggleWishlist } = useWishlist();

  const cartData = useSelector(getCartData);

  const [isRemovingItem, setIsRemovingItem] = useState<number | null>(null);
  const [wishlistLoadingItems, setWishlistLoadingItems] = useState<Set<number>>(new Set());

  // Fulfillment local state
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    cartData?.fulfillment?.delivery_type || "campus_pickup"
  );
  const [pickupCampus, setPickupCampus] = useState<CampusLocation>(
    cartData?.fulfillment?.pickup_campus || "Accra Main"
  );
  const [shippingAddress, setShippingAddress] = useState({
    street: cartData?.fulfillment?.shipping_address?.street || "",
    city: cartData?.fulfillment?.shipping_address?.city || "",
    region: cartData?.fulfillment?.shipping_address?.region || "Greater Accra",
    phone: cartData?.fulfillment?.shipping_address?.phone || "",
  });

  // Check if any item requires physical fulfillment
  const hasPhysicalItems = Boolean(
    cartData?.courses?.some(
      (item) =>
        item.delivery_type === "shipping" ||
        item.delivery_type === "campus_pickup" ||
        item.attached_book?.format === "physical" ||
        item.attached_book?.format === "both"
    )
  );

  const handleFulfillmentChange = (
    newType: DeliveryType,
    campus?: CampusLocation,
    addr?: typeof shippingAddress
  ) => {
    const updatedType = newType;
    const updatedCampus = campus || pickupCampus;
    const updatedAddr = addr || shippingAddress;

    setDeliveryType(updatedType);
    if (campus) setPickupCampus(campus);
    if (addr) setShippingAddress(addr);

    dispatch(
      updateFulfillment({
        deliveryType: updatedType,
        pickupCampus: updatedCampus,
        shippingAddress: updatedAddr,
      })
    );
  };

  const handleRemoveItem = async (id: number) => {
    try {
      setIsRemovingItem(id);

      // Try API removal first
      try {
        const response = await removeFromCart(id);
        if (response && !response.error) {
          toast.success(response.message || t("item_removed_from_cart"));
          dispatch(removeCoupon(id));

          const updatedCart = await getCartItems();
          if (updatedCart && !updatedCart.error) {
            dispatch(setCartData(updatedCart.data));
          } else {
            dispatch(removeCartItem(id));
          }

          if (updatedCart?.data.courses.length === 0) {
            dispatch(setIsCartPromoApplied(false));
          }
          return;
        }
      } catch {
        // Fallback to local Redux removal for books/bundles
      }

      // Local Redux removal
      dispatch(removeCartItem(id));
      dispatch(removeCourseFromCart(id));
      dispatch(removeCoupon(id));
      toast.success(t("item_removed_from_cart"));
    } catch (error) {
      console.error("Remove item error:", error);
      toast.error(t("unexpected_error_removing_item"));
    } finally {
      setIsRemovingItem(null);
    }
  };

  const handleToggleWishlist = async (id: number, isWishlisted: boolean) => {
    setWishlistLoadingItems((prev) => new Set(prev).add(id));

    try {
      const success = await toggleWishlist(id, isWishlisted);
      if (success) {
        dispatch(
          updateCartItemWishlistStatus({
            courseId: id,
            isWishlisted: !isWishlisted,
          })
        );
        setWishlistLoadingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast.error(t("unexpected_error_toggling_wishlist"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header indicating the number of items */}
      <h2 className="text-xl font-semibold mb-4">
        {t("cart_items_count").replace(
          "{count}",
          cartData?.courses.length?.toString() || "0"
        )}
      </h2>

      {/* Show empty cart state when no items */}
      {!cartData?.courses || cartData.courses.length === 0 ? (
        <DataNotFound />
      ) : (
        <>
          {/* Feature 7: Physical Study Manual Fulfillment Options Region */}
          {hasPhysicalItems && (
            <div data-testid="physical-fulfillment-section" className="bg-white border-2 border-primary/20 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b borderColor pb-3">
                <FiMapPin className="primaryColor" size={20} />
                <div>
                  <h3 className="font-bold text-sm text-gray-900">
                    Physical Study Manual Fulfillment Options
                  </h3>
                  <p className="text-xs text-gray-500">
                    Your cart includes physical ICAG study texts. Select how you wish to receive them.
                  </p>
                </div>
              </div>

              {/* Delivery Choice Radio Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    deliveryType === "campus_pickup"
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-gray-200 bg-gray-50/50 hover:bg-gray-100/50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="deliveryType"
                      data-testid="delivery-type-campus-pickup"
                      checked={deliveryType === "campus_pickup"}
                      onChange={() => handleFulfillmentChange("campus_pickup")}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-xs text-gray-900 block">
                        Campus Collection (Free)
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Collect with instant collection code at your designated ICAG campus bookstore.
                      </span>
                    </div>
                  </div>

                  {deliveryType === "campus_pickup" && (
                    <div className="mt-3 pt-2.5 border-t border-primary/20 space-y-1.5">
                      <span className="text-[11px] font-semibold text-gray-700 block">
                        Choose Collection Center:
                      </span>
                      {CAMPUS_LOCATIONS.map((campus) => (
                        <label
                          key={campus.id}
                          className={`flex items-start gap-2 p-1.5 rounded text-xs cursor-pointer ${
                            pickupCampus === campus.id ? "font-bold text-primary" : "text-gray-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name="pickupCampus"
                            data-testid={`campus-radio-${campus.id.toLowerCase().replace(/\s+/g, '-')}`}
                            checked={pickupCampus === campus.id}
                            onChange={() => handleFulfillmentChange("campus_pickup", campus.id)}
                          />
                          <span>
                            {campus.label}{" "}
                            <span className="text-[10px] text-gray-400 block font-normal">
                              {campus.desc}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </label>

                <label
                  className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    deliveryType === "shipping"
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-gray-200 bg-gray-50/50 hover:bg-gray-100/50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="deliveryType"
                      data-testid="delivery-type-shipping"
                      checked={deliveryType === "shipping"}
                      onChange={() => handleFulfillmentChange("shipping")}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-xs text-gray-900 block flex items-center gap-1.5">
                        <FiTruck size={14} className="primaryColor" /> Ghana Post / Courier Delivery
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Door-to-door dispatched delivery via Speedlink with tracking number.
                      </span>
                    </div>
                  </div>

                  {deliveryType === "shipping" && (
                    <div className="mt-3 pt-2.5 border-t border-primary/20 space-y-2 text-xs">
                      <div>
                        <input
                          type="text"
                          data-testid="shipping-street-input"
                          placeholder="Street Address in Ghana *"
                          value={shippingAddress.street}
                          onChange={(e) =>
                            handleFulfillmentChange("shipping", undefined, {
                              ...shippingAddress,
                              street: e.target.value,
                            })
                          }
                          className="w-full p-2 border borderColor rounded bg-white text-xs focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          data-testid="shipping-city-input"
                          placeholder="City / Town *"
                          value={shippingAddress.city}
                          onChange={(e) =>
                            handleFulfillmentChange("shipping", undefined, {
                              ...shippingAddress,
                              city: e.target.value,
                            })
                          }
                          className="w-full p-2 border borderColor rounded bg-white text-xs focus:outline-none"
                        />
                        <input
                          type="text"
                          data-testid="shipping-region-input"
                          placeholder="Region (e.g. Greater Accra)"
                          value={shippingAddress.region}
                          onChange={(e) =>
                            handleFulfillmentChange("shipping", undefined, {
                              ...shippingAddress,
                              region: e.target.value,
                            })
                          }
                          className="w-full p-2 border borderColor rounded bg-white text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Map over the cart items */}
          {cartData.courses.map((item) => {
            const couponCode = cartData?.promo_discounts?.find(
              (promo) => promo.course_id === item.id
            )?.promo_code;

            const isBundle = item.is_bundle || item.type === "bundle";
            const isBook = item.type === "book";

            return (
              <div
                key={item.id}
                className="flex flex-col md:flex-row gap-4 border border-gray-200 rounded-2xl p-4 relative bg-white shadow-xs"
              >
                {/* Course or Book Image Placeholder */}
                <Link
                  href={isBook ? "/shop" : `/course-details/${item.slug || item.id}`}
                  className="h-[80px] w-[80px] md:h-[120px] md:w-[120px] bg-gray-100 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-100"
                >
                  {item.thumbnail ? (
                    <CustomImageTag
                      src={item.thumbnail}
                      alt={item.title}
                      className="object-cover h-[80px] w-[80px] md:h-[120px] md:w-[120px] rounded-2xl"
                    />
                  ) : (
                    <FiBookOpen size={36} className="primaryColor opacity-50" />
                  )}
                </Link>

                {/* Course Details & Actions Combined Flex Container */}
                <div className="flex flex-col flex-grow justify-between">
                  {/* Top section for details */}
                  <div className="space-y-1.5">
                    {/* Item Type Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isBundle ? (
                        <span className="bg-primary/10 text-primary font-semibold text-xs px-2.5 py-0.5 rounded-full">
                          ICAG Course + Study Text Bundle
                        </span>
                      ) : isBook ? (
                        <span className="bg-amber-100 text-amber-800 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                          ICAG Prescribed Study Text
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-700 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                          Official Course
                        </span>
                      )}

                      {couponCode && (
                        <span className="tertiaryColor text-xs px-2.5 py-0.5 rounded flex items-center gap-1">
                          <FaTag size={12} />
                          {t("coupon_applied")}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base md:text-lg font-semibold text-gray-900 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-gray-500">
                      {t("by_label")}{" "}
                      <span className="font-semibold text-gray-800">
                        {item.instructor || "ICAG Academic Faculty"}
                      </span>
                    </p>

                    {/* Feature 6 & 8: Itemized Bundle Breakdown */}
                    {isBundle && item.attached_book && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 my-2 text-xs space-y-1">
                        <div className="flex justify-between text-gray-600">
                          <span>Official Study Text:</span>
                          <span className="font-medium text-gray-800">
                            {item.attached_book.title} (GH₵{" "}
                            {Number(item.attached_book.price_ghs).toFixed(2)})
                          </span>
                        </div>
                        {item.bundle_discount_ghs && item.bundle_discount_ghs > 0 ? (
                          <div className="flex justify-between text-green-600 font-medium">
                            <span>Bundle Discount Applied:</span>
                            <span>- {getCurrencySymbol()}{Number(item.bundle_discount_ghs).toFixed(2)}</span>
                          </div>
                        ) : null}
                        {item.double_charge_prevented && (
                          <div className="bg-green-50 border border-green-200 text-green-700 p-1.5 rounded text-[11px] font-medium flex items-center gap-1.5 mt-1">
                            <FaCheckCircle size={12} />
                            <span>
                              {item.breakdown_notice ||
                                "Duplicate fee prevented: Student already possesses part of this bundle."}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Standalone Book Delivery Details */}
                    {isBook && (
                      <p className="text-xs text-gray-500">
                        Fulfillment:{" "}
                        <strong className="text-gray-700 capitalize">
                          {item.delivery_type === "campus_pickup"
                            ? `Campus Collection (${item.pickup_campus || "Accra Main"})`
                            : item.delivery_type === "shipping"
                            ? "Speedlink Courier Delivery"
                            : "Instant Digital DRM Streaming"}
                        </strong>
                      </p>
                    )}

                    {/* Price Line */}
                    <div className="pt-1">
                      {item.course_discount && item.course_discount > 0 ? (
                        <div className="flex items-center gap-2 font-semibold flex-wrap">
                          <span className="text-lg text-gray-900">
                            {getCurrencySymbol()}{Number(item.subtotal ?? item.final_price).toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-400 line-through font-normal">
                            {getCurrencySymbol()}{Number(item.original_price ?? item.display_price).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-gray-900">
                          {getCurrencySymbol()}{Number(item.final_price ?? item.original_price ?? item.display_price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="flex flex-col items-start gap-1 pt-3 mt-2 sm:flex-row sm:items-center sm:gap-4 text-xs text-gray-600 border-t border-gray-100">
                    {!isBook && (
                      <>
                        <button
                          className="flex items-center gap-1 hover:primaryColor transition-colors cursor-pointer"
                          disabled={wishlistLoadingItems.has(item.id)}
                          onClick={() => handleToggleWishlist(item.id, item.is_wishlisted)}
                        >
                          {wishlistLoadingItems.has(item.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : item.is_wishlisted ? (
                            <FaBookmark size={14} className="primaryColor" />
                          ) : (
                            <FiBookmark size={14} />
                          )}
                          {item.is_wishlisted ? t("remove_from_wishlist") : t("move_to_wishlist")}
                        </button>
                        <div className="h-3 w-[1px] bg-gray-200 hidden sm:block"></div>
                      </>
                    )}

                    <button
                      className="flex items-center gap-1 hover:text-red-600 transition-colors cursor-pointer"
                      disabled={isRemovingItem === item.id}
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      {isRemovingItem === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FiTrash2 size={14} />
                      )}
                      <span>{t("remove_item")}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
