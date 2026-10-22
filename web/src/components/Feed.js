import { useEffect } from "react";
import { useSelector } from "react-redux";
import "../styles/feed.css";
import Post from "./Post";

export default function Feed({postsData = {}}) {
  const user = useSelector((state) => state.auth.user)

  const removeFeedPadding = (feed, initialWindowHeight) => {
    if (
      window.innerHeight + 50 < initialWindowHeight &&
      window.innerWidth < 500
    ) {
      feed.style.paddingBottom = 0;
    }
  };
  
  useEffect(() => {
    const initialWindowHeight = window.innerHeight;
    const feed = document.getElementById("feedAlt");
    if ("visualViewport" in window) {
      window.visualViewport.addEventListener("resize", () =>
        removeFeedPadding(feed, initialWindowHeight)
      );
    }
    return () => {
      window.visualViewport.removeEventListener("resize", () =>
        removeFeedPadding(feed, initialWindowHeight)
      );
    };
  }, []);

  return (
    <div className="feed scrollbar-hidden" id="feedAlt">
      <div className="feed__wrapper">
        {user && postsData?.data && postsData?.data.map((post) => (
          <Post
            key={post._id}
            id={post._id}
            userId={post.userId}
          />
        ))}
      </div>
    </div>
  );
}
