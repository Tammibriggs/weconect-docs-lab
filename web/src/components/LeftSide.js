import FollowersCard from "./FollowCard";
// import MiniprofileCard from "./MiniProfileCard";
import "../styles/leftSide.css";
import { Link } from "react-router-dom";
import ProfileCard from "./ProfileCard";
import { useSelector } from "react-redux";

const LeftSide = () => {

  const user = useSelector((state) => state.auth.user)
 
  return (
    <div className="leftSide">
      <div className="leftSide__wrapper">
        <Link to="/" className="logo">
          <h1>weConect</h1>
        </Link>
        {/* <MiniprofileCard/> */}
        <ProfileCard
          name={user.username}
          coverImage={user.coverPicture}
          profileImage={user.profilePicture}
          bio={user.bio}
          employmentStatus={user.employmentStatus}
          country={user.country}
          relationship={user.relationship}
          followers={user.followers.legth}
          following={user.followings.legth}
          showViewBtn={true}
        />
        <FollowersCard />
      </div>
    </div>
  );
};

export default LeftSide;
