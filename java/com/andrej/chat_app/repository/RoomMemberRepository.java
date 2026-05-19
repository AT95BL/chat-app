package com.andrej.chat_app.repository;

import com.andrej.chat_app.model.RoomMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {
    List<RoomMember> findByRoomId(Long roomId);
    List<RoomMember> findByUsername(String username);
    Optional<RoomMember> findByRoomIdAndUsername(Long roomId, String username);
    boolean existsByRoomIdAndUsername(Long roomId, String username);
    void deleteByRoomIdAndUsername(Long roomId, String username);
}