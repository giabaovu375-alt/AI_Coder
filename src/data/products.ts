export interface Product {
  id: number;
  icon: string;
  name: string;
  description: string;
  color: string;
  image: string;
}

export const BIG_PRODUCT: Product = {
  id: 1,
  icon: 'Bot',
  name: 'Nova Studio',
  description: 'Nền tảng sáng tạo nội dung toàn diện được hỗ trợ bởi AI — từ viết bài, thiết kế đồ họa đến tạo video.',
  color: 'from-blue-600 to-cyan-500',
  image: '/images/nova-studio.jpg',
};

export const SMALL_PRODUCTS: Product[] = [
  {
    id: 2,
    icon: 'Image',
    name: 'Nova Vision',
    description: 'Tạo hình ảnh AI từ mô tả văn bản.',
    color: 'from-rose-500 to-orange-400',
    image: '/images/nova-vision.jpg',
  },
  {
    id: 3,
    icon: 'Code2',
    name: 'Nova Code',
    description: 'Trợ lý lập trình thông minh.',
    color: 'from-emerald-500 to-teal-400',
    image: '/images/nova-code.jpg',
  },
  {
    id: 4,
    icon: 'Globe',
    name: 'Nova Translate',
    description: 'Dịch thuật tức thì 100+ ngôn ngữ.',
    color: 'from-amber-500 to-yellow-400',
    image: '/images/nova-translate.jpg',
  },
];
