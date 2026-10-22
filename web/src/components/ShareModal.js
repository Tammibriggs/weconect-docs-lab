import { Modal, useMantineTheme } from "@mantine/core";
import Share from "./Share";
import '../styles/shareModal.css'

function ShareModal({ modalOpened, setModalOpened }) {
  const theme = useMantineTheme();

  return (
    <Modal
      overlayColor={
        theme.colorScheme === "dark"
          ? theme.colors.dark[9]
          : theme.colors.gray[2]
      }
      overlayOpacity={0.55}
      overlayBlur={3}
      size="55%"
      opened={modalOpened}
      onClose={() => setModalOpened(false)}
    >
    <Share closeModal={() => setModalOpened(false)}/>
    </Modal>
  );
}

export default ShareModal; 
