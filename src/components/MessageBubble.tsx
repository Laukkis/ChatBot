import styles from "./MessageBubble.module.scss";

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
  return (
    <div className={isUser ? styles.userBubble : styles.botBubble}>
      {message}
    </div>
  );
};

export default MessageBubble;
