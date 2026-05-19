package com.andrej.chat_app.repository;

import com.andrej.chat_app.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByName(String name);
    boolean existsByName(String name);

    @Query("SELECT r FROM Room r WHERE r.isPrivate = false")
    List<Room> findAllPublicRooms();
}