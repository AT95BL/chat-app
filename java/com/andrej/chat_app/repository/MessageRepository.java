package com.andrej.chat_app.repository;

import com.andrej.chat_app.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findTop50ByRoomIdOrderBySentAtAsc(Long roomId);
}