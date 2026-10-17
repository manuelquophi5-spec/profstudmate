"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiBookOpen, FiShoppingCart, FiCheck, FiInfo } from "react-icons/fi";
import { Book } from "@/types/bookstore";
import { useDispatch, useSelector } from "react-redux";
import { addBookToCart, getCartData } from "@/redux/reducers/cartSlice";
import { selectOwnedBookIds } from "@/redux/reducers/bookstoreSlice";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BookCardProps {
  book: Book;
  onAddToCartSuccess?: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onAddToCartSuccess }) => {
  const dispatch = useDispatch();
  const cartData = useSelector(getCartData);
  const ownedBookIds = useSelector(selectOwnedBookIds);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const isOwned = ownedBookIds.includes(book.id);

  // Check if book is already in cart either as standalone or in a bundle
  const isBookInCart = cartData?.courses?.some(
    (item) => item.book_id === book.id || (item.is_bundle && item.attached_book?.id === book.id)
  );

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBookInCart) {
      toast.error(`"${book.title}" is already in your cart.`);
      return;
    }

    dispatch(
      addBookToCart({
        book,
        ownsBook: isOwned,
      })
    );

    if (isOwned) {
      toast.success(`"${book.title}" added to cart with GH₵ 0.00 fee (owned entitlement).`);
    } else {
      toast.success(`"${book.title}" added to your cart.`);
    }

    if (onAddToCartSuccess) {
      onAddToCartSuccess();
    }
  };

  const formatBadgeText =
    book.format === "digital"
      ? "Digital Manual"
      : book.format === "physical"
      ? "Physical Manual"
      : "Digital & Physical";

  return (
    <>
      <div data-testid={`book-card-${book.id}`} className="rounded-[16px] overflow-hidden bg-white flex flex-col justify-between h-full border borderColor p-3 md:p-4 group shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex flex-col gap-3">
          {/* Book Cover Image */}
          <div className="relative bg-gray-100 w-full h-[220px] rounded-[16px] overflow-hidden flex items-center justify-center">
            {book.cover_image && !book.cover_image.includes("default") ? (
              <Image
                src={book.cover_image}
                alt={book.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-gray-400 p-4 text-center">
                <FiBookOpen size={48} className="primaryColor opacity-60" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Official ICAG Study Text
                </span>
              </div>
            )}

            {/* Format Tag */}
            <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[11px] font-semibold py-1 px-2.5 rounded-full">
              {formatBadgeText}
            </span>

            {/* Owned Tag */}
            {isOwned && (
              <span data-testid="book-owned-badge" className="absolute top-2 right-2 bg-green-600 text-white text-[11px] font-semibold py-1 px-2.5 rounded-full flex items-center gap-1 shadow-sm">
                <FiCheck size={12} /> Owned
              </span>
            )}
          </div>

          {/* Level and Stock */}
          <div className="flex items-center justify-between pt-1">
            <span className="primaryLightBg primaryColor py-1 px-3 rounded-full text-xs font-semibold capitalize">
              {book.level}
            </span>
            {book.is_available ? (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                In Stock ({book.stock_quantity ?? 50})
              </span>
            ) : (
              <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                Out of Stock
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <h3
              data-testid="book-title"
              onClick={() => setIsDetailOpen(true)}
              className="font-semibold text-base group-hover:primaryColor sm:min-h-[44px] h-[48px] transition-all duration-300 line-clamp-2 cursor-pointer leading-snug"
              title={book.title}
            >
              {book.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Author: <span className="font-medium text-gray-700">ICAG Board of Studies</span>
            </p>
            {book.isbn && (
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                ISBN: {book.isbn}
              </p>
            )}
          </div>
        </div>

        {/* Price & Actions */}
        <div className="mt-4 pt-3 border-t borderColor flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs text-gray-400 block">Institute Price</span>
              <span data-testid="book-price" className="text-xl md:text-2xl font-bold primaryColor">
                GH₵ {Number(book.price_ghs).toFixed(2)}
              </span>
            </div>
            <button
              data-testid="book-details-btn"
              onClick={() => setIsDetailOpen(true)}
              className="text-xs primaryColor hover:underline font-medium flex items-center gap-1"
            >
              <FiInfo size={14} /> Details
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isOwned && (book.format === "digital" || book.format === "both") ? (
              <Link
                href={`/book-reader/${book.id}`}
                data-testid="read-online-btn"
                className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-[6px] text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <FiBookOpen size={16} /> Read Online
              </Link>
            ) : isBookInCart ? (
              <button
                disabled
                data-testid="in-cart-btn"
                className="w-full py-2 px-3 border border-gray-300 bg-gray-100 text-gray-500 text-sm font-medium rounded-[6px] cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <FiCheck size={16} /> In Cart
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!book.is_available}
                data-testid="add-to-cart-btn"
                className="w-full py-2 px-3 commonBtn !text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <FiShoppingCart size={16} /> Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Book Details Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 bg-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{book.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <span className="primaryLightBg primaryColor py-1 px-3 rounded-full text-xs font-semibold">
                {book.level}
              </span>
              <span className="bg-gray-100 text-gray-700 py-1 px-3 rounded-full text-xs font-semibold">
                {formatBadgeText}
              </span>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Official ICAG study text authored by the Institute of Chartered Accountants, Ghana.
              Provides exhaustive coverage of syllabus learning outcomes, illustrative computational
              workings, case law references, and model past exam examination questions.
            </p>

            <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1.5 border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">ISBN:</span>
                <span className="font-mono font-medium">{book.isbn || "978-9988-1-2345-0"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Qualification Body:</span>
                <span className="font-medium">ICAG / CITG Ghana</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fulfillment Type:</span>
                <span className="font-medium capitalize">
                  {book.format === "physical"
                    ? "Campus Collection / Courier Delivery"
                    : book.format === "digital"
                    ? "Instant Secure DRM Browser Reader"
                    : "DRM Stream + Campus Collection"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Available Stock:</span>
                <span className="font-medium">{book.stock_quantity ?? 50} units</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-gray-200">
              <div>
                <span className="text-xs text-gray-400 block">Official Price</span>
                <span className="text-2xl font-bold primaryColor">
                  GH₵ {Number(book.price_ghs).toFixed(2)}
                </span>
              </div>
              <div>
                {isOwned && (book.format === "digital" || book.format === "both") ? (
                  <Link
                    href={`/book-reader/${book.id}`}
                    onClick={() => setIsDetailOpen(false)}
                    data-testid="modal-read-online-btn"
                    className="py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-[6px] flex items-center gap-1.5"
                  >
                    <FiBookOpen size={16} /> Read Online Now
                  </Link>
                ) : (
                  <button
                    onClick={(e) => {
                      handleAddToCart(e);
                      setIsDetailOpen(false);
                    }}
                    disabled={isBookInCart}
                    data-testid="modal-add-to-cart-btn"
                    className="py-2.5 px-4 commonBtn !text-sm flex items-center gap-1.5"
                  >
                    <FiShoppingCart size={16} /> {isBookInCart ? "In Cart" : "Add to Cart"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
