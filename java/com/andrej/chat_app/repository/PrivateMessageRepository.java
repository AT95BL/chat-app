package com.andrej.chat_app.repository;

import com.andrej.chat_app.model.PrivateMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PrivateMessageRepository extends JpaRepository<PrivateMessage, Long> {

    @Query("SELECT m FROM PrivateMessage m WHERE " +
            "(m.senderUsername = :user1 AND m.receiverUsername = :user2) OR " +
            "(m.senderUsername = :user2 AND m.receiverUsername = :user1) " +
            "ORDER BY m.sentAt ASC")
    List<PrivateMessage> findConversation(String user1, String user2);
}