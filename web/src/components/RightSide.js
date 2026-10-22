import { useSelector } from "react-redux";
import "../styles/rightSide.css";
import Messaging from "./Message";
import SearchPeople from "./SearchPeople";

const RightSide = ({ setModalOpened }) => {

  const userData = useSelector((state) => state.auth)

  return (
    <div className="rightSide">
      <div style={{ position: "sticky", top: 10 }}>
        <SearchPeople userData={userData}/>
        <Messaging />
        <div className="action-cont">
          <button
            className="button r-button"
            onClick={() => setModalOpened(true)}
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default RightSide;
