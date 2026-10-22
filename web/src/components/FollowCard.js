import "../styles/followCard.css";
import {useState } from "react";
import { formatNumber } from "../modules/formatNumber";
import { 
  useGetFollowersQuery, 
  useGetFollowingQuery,
  useFollowMutation,
  useUnfollowMutation
 } from "../redux/services/user";

const FollowCard = ({ pathname }) => {
  const [selected, setSelected] = useState(pathname || "followers");
  const { data } = useGetFollowersQuery()
  const { data:followData } = useGetFollowingQuery()
  const [follow] = useFollowMutation()
  const [unfollow] = useUnfollowMutation()

  return ( 
    <div className="followCard__cont">
      <div className="followCard">
        <div className="followCard__head">
          <span
            style={{
              background: `${selected === "followers" ? "white" : "none"}`,
            }}
            onClick={() => setSelected("followers")}
          >
            Followers
            <span className="tag">{formatNumber(data?.data.length || 0)}</span>
          </span>
          <span
            style={{
              background: `${selected === "following" ? "white" : "none"}`,
            }}
            onClick={() => setSelected("following")}
          >
            Following
            <span className="tag">{formatNumber(followData?.data.length || 0)}</span>
          </span>
        </div>
        {selected === "following" ? (
          <div className="followCard__list scrollbar-hidden">
            {followData?.status === 'ok' && followData.data.map((follow, i) => {
              return (
                <div className="followCard__follow" key={i}>
                  <div>
                    <img src={follow.profilePicture?.url ? follow.profilePicture?.url : '/assets/noPic.webp'} alt="" className="followImage" />
                    <span>{follow.username}</span>
                  </div>
                  <span className="followCard__action" 
                  onClick={async () => {
                    await unfollow({userId: follow.id})
                  }}>Unfollow</span>
                </div>
              );
            })}
          </div> 
        ) : (
          <div className="followCard__list scrollbar-hidden">
            {data?.status === 'ok' && data.data.map((follower, i) => {
              return (
                <div className="followCard__follow" key={i}>
                  <div>
                    <img src={follower.profilePicture?.url ? follower.profilePicture?.url : '/assets/noPic.webp'} alt="" className="followImage" />
                    <span>{follower.username}</span>
                  </div>
                  <span className="followCard__action" 
                  onClick={async () => {
                    if(follower.following) await unfollow({userId: follower.id})
                    else await follow({userId: follower.id});
                  }}>
                    {follower.following ? 'Unfollow' : 'Follow'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowCard;
