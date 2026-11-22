import { useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import AudiencePicker from './AudiencePicker';

jest.mock('axios', () => ({ get: jest.fn() }));

const friend = {
  _id: 'friend-1',
  first_name: 'Bình',
  last_name: 'Nguyễn',
  username: 'binh',
  photo: '/avatar.png',
};

function Picker() {
  const [audience, setAudience] = useState('public');
  const [viewers, setViewers] = useState([]);
  return (
    <AudiencePicker
      audience={audience}
      setAudience={setAudience}
      viewers={viewers}
      setViewers={setViewers}
      onDone={() => {}}
    />
  );
}

beforeEach(() => {
  axios.get.mockReset();
  axios.get.mockResolvedValue({ data: { data: { friendLists: [friend] } } });
});

test('offers three audiences and immediately lists accepted friends when selected', async () => {
  await act(async () => {
    render(<Picker />);
  });
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  fireEvent.click(screen.getByRole('radio', { name: /Bạn bè được chọn/ }));
  expect(await screen.findByRole('checkbox', { name: /Bình Nguyễn/ })).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith(
    expect.stringContaining('/friends/friendsPage'),
    expect.any(Object)
  );
  expect(screen.getByRole('button', { name: 'Xong' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /Bình Nguyễn/ }));
  expect(screen.getByRole('button', { name: 'Xong' })).toBeEnabled();
  expect(screen.getByText('Đã chọn 1/100')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'binh' } });
  expect(screen.getByRole('checkbox', { name: /Bình Nguyễn/ })).toBeChecked();
  expect(axios.get).toHaveBeenCalledTimes(1);
});

test('all-friends audience does not require picking individual people', async () => {
  await act(async () => {
    render(<Picker />);
  });
  fireEvent.click(screen.getByRole('radio', { name: /^Bạn bè Tất cả/ }));
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Xong' })).toBeEnabled();
});

test('shows an empty state and prevents confirming selected friends when none exist', async () => {
  axios.get.mockResolvedValue({ data: { data: { friendLists: [] } } });
  await act(async () => {
    render(<Picker />);
  });
  fireEvent.click(screen.getByRole('radio', { name: /Bạn bè được chọn/ }));
  expect(await screen.findByText(/Bạn chưa kết bạn với ai/)).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Xong' })).toBeDisabled();
});
