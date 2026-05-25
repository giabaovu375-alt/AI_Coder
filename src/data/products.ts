export interface Product {
  id: string;
  title: string;
  description: string;
  link: string;
  image: string; // URL ảnh (có thể để rỗng nếu chưa có)
}

export const MY_PRODUCTS: Product[] = [
  {
    id: 'codenova',
    title: 'CodeNova',
    description:
      'Nền tảng học lập trình tương tác với AI. Học Python, JavaScript, C++ , HTML , CSS và Java qua các bài giảng chi tiết, bài tập thực hành và AI tutor hỗ trợ 24/7.',
    link: 'https://codenova.giabaovu375-alt.workesr.dev', // Link thật của bro
    image: '/images/codenova.jpg', // Bro để ảnh vào public/images/
  },
  {
    id: 'ai-coder',
    title: 'AI Coder',
    description:
      'Trợ lý lập trình AI mạnh mẽ, tự host trên Hugging Face. Giúp bạn viết code, debug, giải thích thuật toán và tối ưu code.',
    link: 'https://toilatop1sever-ai-coder.hf.space', // Link thật của bro
    image: '/images/ai-coder.jpg',
  },
  {
    id: 'chess-review',
    title: 'Game Review',
    description:
      'Phân tích ván cờ miễn phí, không giới hạn. Đánh giá từng nước đi, phân loại lỗi (Blunder, Mistake, Inaccuracy), gợi ý nước đi tốt nhất.',
    link: '#', // Bro cập nhật link sau khi deploy
    image: '/images/chess-review.jpg',
  },
  {
    id: 'ai-orchestrator',
    title: 'AI Orchestrator',
    description:
      'Hệ thống AI đa tác nhân, phối hợp 12+ model miễn phí để sinh code và trả lời câu hỏi chính xác nhất.',
    link: '#', // Bro cập nhật link sau
    image: '/images/ai-orchestrator.jpg',
  },
  {
    id: 'web-hack',
    title: 'Web Hack Tools',
    description:
      'Tổng hợp các công cụ hack game, share code, và các thủ thuật lập trình hữu ích cho người mới bắt đầu.',
    link: '#',
    image: '/images/web-hack.jpg',
  },
];
