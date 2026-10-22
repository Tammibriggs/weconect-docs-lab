import "../styles/profileCard.css";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@mui/material";
import { useRef, useState } from "react";
import EditProfile from "./EditProfile";
import { useSelector } from "react-redux";
import { useFollowMutation, useUnfollowMutation } from "../redux/services/user";

export default function ProfileCard({
  name,
  coverImage,
  profileImage, 
  bio,
  following,
  followers,
  showProfileBtn,
  showViewBtn,
  userId
}) {

  const user = useSelector((state) => state.auth.user)
  const [editIsLoading, setEditIsLoading] = useState(false)
  const [coverPic, setCoverPic] = useState({url: '', filename: ''})
  const [profilePic, setProfilePic] = useState({url: '', filename: ''})
  const profileImageRef = useRef()
  const coverImageRef = useRef()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [searchParams] = useSearchParams()

  const [follow] = useFollowMutation()
  const [unfollow] = useUnfollowMutation() 

  const onImageChange = (event, setImage) => {
    if (event.target.files && event.target.files[0]) {
      if(event.target.files[0]['type'].split('/')[0] === 'image') {
        let img = event.target.files[0];
        setImage({url: URL.createObjectURL(img), filename: ''})
      }
    }
  };

  const handleFollow = () => {
    if(user.followings.includes(userId)) unfollow({userId})
    if(!user.followings.includes(userId)) follow({userId})
  }

  return (
    <div className="profileCard__cont">
      <div className="profileCard">
        <img
          src={coverImage?.url ? coverImage?.url : "/assets/noCover.avif"}
          alt="cover"
        />
        <div className="profileCard__profileImage">
          <img
            src={profileImage?.url ? profileImage?.url : "/assets/noProfile.jpg"}
            alt="profile"
          />
          <div>
            <h2>{name}</h2>
            {showProfileBtn &&
              <Button onClick={() => setIsEditOpen(true)}>{editIsLoading ? 'Updating...' : 'Edit profile'}</Button>
            }
            {window.location.pathname !== '/' && searchParams.get('id') !== user._id &&
              <Button
                onClick={handleFollow}
              >
                {user.followings.includes(userId) ? 'Unfollow' : 'Follow'}
              </Button>
            }
          </div>
        </div>
        <div className="profileCard__details">
          <h2>{name}</h2>
          <p>{bio}</p>
          <div className="profileCard__follow">
            <Link to="/followers">
              <span>{followers}</span> Followers
            </Link>
            <Link to="/following">
              <span>{following}</span> Following
            </Link>
          </div>
        </div>
        {showViewBtn &&
          <Link to={`/profile/?id=${user._id}`}>View Profile</Link>
        }
      </div>
      <EditProfile 
        coverImage={coverImage}
        profileImage={profileImage}
        isEditOpen={isEditOpen}
        setIsEditOpen={setIsEditOpen}
        name={name}
        bio={bio}
        profileImageRef = {profileImageRef}
        coverImageRef={coverImageRef}
        coverPic={coverPic}
        profilePic={profilePic}
        setProfilePic={setProfilePic}
        setCoverPic={setCoverPic}
        editIsLoading={editIsLoading}
        setEditIsLoading={setEditIsLoading}
      />
      <div style={{ display: "none" }}>
        <input
          type="file"
          name="profile"
          ref={profileImageRef}
          accept="image/*"
          onChange={(e) => onImageChange(e, setProfilePic)}
        />
        <input
          type="file"
          name="cover"
          ref={coverImageRef}
          accept="image/*"
          onChange={(e) => onImageChange(e, setCoverPic)}
        />
      </div>
    </div>
  );
}
