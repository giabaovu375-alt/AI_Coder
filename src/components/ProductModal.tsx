import React from 'react';
import type { Product } from '../data/products';

interface Props {
  product: Product;
  onClose: () => void;
  onViewDetail: (id: string) => void; // THÊM
}

const ProductModal: React.FC<Props> = ({ product, onClose, onViewDetail }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700/40 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Ảnh sản phẩm */}
        {product.image && (
          <div className="aspect-video w-full overflow-hidden bg-slate-800">
            <img
              src={product.image}
              alt={product.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Nội dung */}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-3">{product.title}</h2>
          <p className="text-slate-300 text-base leading-relaxed mb-6">
            {product.description}
          </p>

          {/* Nút bấm */}
          <div className="flex flex-col gap-3">
            <a
              href={product.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3 text-white font-medium shadow-lg shadow-violet-500/20 hover:from-violet-600 hover:to-purple-700 transition-all active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Truy cập
            </a>
            <div className="flex gap-3">
              <button
                onClick={() => onViewDetail(product.id)}
                className="flex-1 rounded-xl bg-slate-800 px-5 py-3 text-white font-medium hover:bg-slate-700 transition-all active:scale-[0.98]"
              >
                Xem chi tiết
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-600 px-5 py-3 text-slate-300 font-medium hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
