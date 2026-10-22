import { Link } from "react-router-dom";
import "../styles/miniProfileCard.css";

const MiniProfileCard = () => {
  return (
    <div className="miniProfileCard">
      <div className="ProfileImages">
        <img src='assets/cover.jpg' alt="" />
        <img src='assets/profileImg.jpg' alt="" />
      </div>

      <div className="profileName">
        <span>Zendaya MJ</span>
        <span>Senior UI/UX Designer</span>
      </div>

      <div className="followStatus">
        <hr />
        <div>
          <div className="follow">
            <span>6,890</span>
            <span>Followings</span>
          </div>
          <div className="vl"></div>
          <div className="follow">
            <span>1</span>
            <span>Followers</span>
          </div>
          <div className="vl"></div>
          <div className="follow">
            <span>3</span>
            <span>Posts</span>
          </div>
        </div>
        <hr />
      </div>
      <Link to='profile'>My Profile</Link>
    </div>
  );
};

export default MiniProfileCard;
