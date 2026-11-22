import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SharedPost from './SharedPost';

test('a deleted original displays an explanation with no broken links', () => {
  const { container } = render(<SharedPost post={null} />);
  expect(screen.getByText(/Bài viết gốc không còn khả dụng/)).toBeTruthy();
  expect(container.querySelector('a')).toBeNull();
  expect(container.textContent).not.toContain('undefined');
});

test('a share can become unavailable after a refresh without breaking hooks', () => {
  const post = {
    _id: 'original',
    type: 'normal',
    text: 'Nội dung bài gốc',
    user: { first_name: 'An', last_name: 'Nguyễn', username: 'annguyen' },
  };
  const { rerender } = render(
    <MemoryRouter>
      <SharedPost post={post} />
    </MemoryRouter>
  );
  expect(screen.getByText('Nội dung bài gốc')).toBeTruthy();
  expect(screen.getByText('An Nguyễn').getAttribute('href')).toBe('/profile/annguyen');
  rerender(
    <MemoryRouter>
      <SharedPost post={null} />
    </MemoryRouter>
  );
  expect(screen.getByText(/Bài viết gốc không còn khả dụng/)).toBeTruthy();
});
