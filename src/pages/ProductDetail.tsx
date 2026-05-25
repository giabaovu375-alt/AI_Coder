import { ArrowLeft, ExternalLink } from 'lucide-react';
import { MY_PRODUCTS } from '../data/products';

interface Props {
  id: string;
  onBack: () => void;
}

export default function ProductDetail({ id, onBack }: Props) {
  const product = MY_PRODUCTS.find(p => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p>Sản phẩm không tồn tại.</p>
        <button onClick={onBack} className="ml-4 text-violet-400">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span>Quay lại</span>
        </button>

        {product.image && (
          <div className="rounded-2xl overflow-hidden mb-8 aspect-video bg-slate-800">
            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
          </div>
        )}

        <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
        <p className="text-lg text-slate-300 leading-relaxed mb-8">{product.description}</p>

        <a
          href={product.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 text-white font-medium shadow-lg shadow-violet-500/20 hover:from-violet-600 hover:to-purple-700 transition-all"
        >
          <ExternalLink className="h-4 w-4" />
          Truy cập sản phẩm
        </a>
      </div>
    </div>
  );
}
