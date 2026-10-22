import React, { useState, useRef } from "react";
import "../styles/share.css";
import { AddPhotoAlternate, Send } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { useCreatePostMutation } from "../redux/services/post";
import { storage } from '../firebase'
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"

const Share = ({closeModal = () => {}}) => {
  const [image, setImage] = useState(null);
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const [postShareIsLoading, setPostShareIsLoading] = useState(false)
  const imageRef = useRef();
  const userData = useSelector((state) => state.auth.user)
  const [createPost] = useCreatePostMutation()
  
  const onImageChange = (event, setImage) => {
    setError('')
    if (event.target.files && event.target.files[0]) {
      if(event.target.files[0]['type'].split('/')[0] === 'image') {
        let img = event.target.files[0];
        setImage({
          image: URL.createObjectURL(img),
        })
      }
      else {
        setError('Only images are accepted')
      }
    }
  }
 
  const removeImage = () => {
    setImage(null)
    imageRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let url = ''
    let filename = ''
    setPostShareIsLoading(true)
    setImage(null)
    setInputValue('')
    if (imageRef.current.files && imageRef.current.files[0]) {
      if(imageRef.current.files[0]['type'].split('/')[0] === 'image') {
        const file = imageRef.current.files[0];
        filename = file.name + Date.now()
        const storageRef = ref(storage, `weConect/${filename}`)
        try{
          const snapshot = await uploadBytes(storageRef, file)
          url = await getDownloadURL(snapshot.ref)
        }catch (err) {
          setPostShareIsLoading(false)
          return setError('Image uploading failed')
        }
      }
    }
    const result = await createPost({desc: inputValue, img: {url, filename}, userId: userData._id})
    if(result.error){
      setPostShareIsLoading(false)
      return setError('Unable to upload post')
    }
    
    imageRef.current.value = '' 
    setPostShareIsLoading(false)
    closeModal()
  }

  return (
    <div className="share__cont">
      <div className="share">
        <img src={userData.profilePicture.url ? userData.profilePicture.url : '/assets/noPic.webp' } alt="profile" />
        <form onSubmit={handleSubmit}>
          {/* <input type="text" placeholder="What's happening" className="shareinput" /> */}
          <textarea 
            type="text" 
            placeholder="What's happening" 
            className="shareinput"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            ></textarea>
          <div className="postOptions">
            <div
              className="option"
              style={{ color: "gray" }}
              onClick={() => imageRef.current.click()}
            >
              <AddPhotoAlternate />
              Photo
            </div>
            <button className="button ps-button" disabled={postShareIsLoading}>
              Share
              <Send
                style={{ width: "20px", height: "20px", color: "gainsboro" }}
              />
            </button>
            <div style={{ display: "none" }}>
              <input
                type="file"
                name="myImage"
                ref={imageRef}
                accept="image/*"
                onChange={(e) => onImageChange(e, setImage)}
              />
            </div>
          </div>
          {error &&
            <span className="previewImage__error">{error}</span>
          }
          {!error && postShareIsLoading &&
            <span>Posting...</span>
          }
          {image && (
            <div className="previewImage">
              <img src={image.image} alt="post" />
              <span onClick={removeImage}>x</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Share;
