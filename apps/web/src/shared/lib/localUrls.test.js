import { normalizeLocalUrls } from './localUrls';

test('legacy media uses LAN origins while text and external links remain intact', () => {
  const data = {
    photo: 'http://localhost:3000/images/default_pic.png',
    messages: [{ content: 'http://localhost:8000/api/v1/messages/files/123' }],
    images: ['http://127.0.0.1:8000/uploads/BACKBOOK/photo.webp'],
    external: 'https://res.cloudinary.com/example/a.jpg',
    text: 'Read http://localhost:8000/uploads/notes',
    resource: 'https://docs.python.org/3/tutorial/',
  };
  const result = normalizeLocalUrls(data, 'http://192.168.1.172:8000', 'http://192.168.1.172:3000');
  expect(result.photo).toBe('http://192.168.1.172:3000/images/default_pic.png');
  expect(result.messages[0].content).toBe('http://192.168.1.172:8000/api/v1/messages/files/123');
  expect(result.images[0]).toBe('http://192.168.1.172:8000/uploads/BACKBOOK/photo.webp');
  expect(result.external).toBe(data.external);
  expect(result.text).toBe('Read http://localhost:8000/uploads/notes');
  expect(result.resource).toBe('https://docs.python.org/3/tutorial/');
});

test('media saved with the previous LAN origin works again on localhost', () => {
  const previous = process.env.REACT_APP_PREVIOUS_LOCAL_ORIGINS;
  process.env.REACT_APP_PREVIOUS_LOCAL_ORIGINS = 'http://192.168.1.172:8000,http://192.168.1.172:3000';
  try {
    const value = normalizeLocalUrls({
      image: 'http://192.168.1.172:8000/uploads/test.webp',
      file: 'http://192.168.1.172:8000/api/v1/messages/files/123?download=1',
      photo: 'http://192.168.1.172:3000/images/default_pic.png',
      otherServer: 'http://192.168.1.10:8000/uploads/other.webp',
    }, 'http://localhost:8000', 'http://localhost:3000');
    expect(value.image).toBe('http://localhost:8000/uploads/test.webp');
    expect(value.file).toBe('http://localhost:8000/api/v1/messages/files/123?download=1');
    expect(value.photo).toBe('http://localhost:3000/images/default_pic.png');
    expect(value.otherServer).toBe('http://192.168.1.10:8000/uploads/other.webp');
  } finally {
    if (previous === undefined) delete process.env.REACT_APP_PREVIOUS_LOCAL_ORIGINS;
    else process.env.REACT_APP_PREVIOUS_LOCAL_ORIGINS = previous;
  }
});
