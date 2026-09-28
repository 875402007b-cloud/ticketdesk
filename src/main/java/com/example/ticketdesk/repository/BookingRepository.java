package com.example.ticketdesk.repository;

import com.example.ticketdesk.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Query("""
            SELECT COALESCE(SUM(b.seats), 0)
            FROM Booking b
            WHERE b.show.id = :showId
            AND b.status = 'CONFIRMED'
            """)
    Long getBookedSeats(@Param("showId") Long showId);
}