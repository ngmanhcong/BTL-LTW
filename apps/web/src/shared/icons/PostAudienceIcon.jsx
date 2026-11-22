import { FaUserCog } from 'react-icons/fa';
import FriendsActive from './friendsActive';
import Public from './public';

export default function PostAudienceIcon({ audience = 'public' }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0, lineHeight: 0 }}>
      {audience === 'friends' ? (
        <FriendsActive color="currentColor" size="1em" />
      ) : audience === 'selected' ? (
        <FaUserCog />
      ) : (
        <Public color="currentColor" />
      )}
    </span>
  );
}
