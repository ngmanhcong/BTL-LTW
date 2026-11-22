import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { queryClient } from 'App';
import { prependPost, syncSharedPostCount } from 'shared/lib/postCache';

const CreatePost = async ({ data, type }) => {
  const reqdata = axios.post(
    `${process.env.REACT_APP_BACKEND_URL}/api/v1/posts/createPost${
      type === 'image' ? '/images' : ''
    }`,
    data,
    {
      withCredentials: true,
    }
  );
  return reqdata;
};

export const useCreatePost = (usernameID) => {
  return useMutation({
    mutationKey: 'useCreatePost',
    mutationFn: CreatePost,
    onSuccess: (response) => {
      const newPost = response.data.data;
      queryClient.setQueryData(['getProfilePosts', usernameID], (old) => prependPost(old, newPost));
      queryClient.setQueryData(['allPosts'], (old) => prependPost(old, newPost));
      syncSharedPostCount(queryClient, newPost);
    },
  });
};
