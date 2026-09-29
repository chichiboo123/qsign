import { BookOpen } from 'lucide-react';

/** 준비 모드 하단 푸터 (문구·링크 변경 금지) */
export function Footer() {
  return (
    <footer className="site-footer">
      <a href="https://litt.ly/chichiboo" target="_blank" rel="noopener noreferrer">
        <BookOpen size={14} aria-hidden="true" />
        Created by. 교육뮤지컬 꿈꾸는 치수쌤
      </a>
    </footer>
  );
}
