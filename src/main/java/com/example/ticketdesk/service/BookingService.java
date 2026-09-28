package com.example.ticketdesk.service;

import com.example.ticketdesk.entity.Booking;
import com.example.ticketdesk.entity.Show;
import com.example.ticketdesk.entity.Student;
import com.example.ticketdesk.repository.BookingRepository;
import com.example.ticketdesk.repository.ShowRepository;
import com.example.ticketdesk.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final StudentRepository studentRepository;
    private final ShowRepository showRepository;

    public BookingService(
            BookingRepository bookingRepository,
            StudentRepository studentRepository,
            ShowRepository showRepository) {

        this.bookingRepository = bookingRepository;
        this.studentRepository = studentRepository;
        this.showRepository = showRepository;
    }

    @Transactional
    public Booking createBooking(
            Long studentId,
            Long showId,
            Integer seats) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() ->
                        new RuntimeException("Student not found"));

        Show show = showRepository.findById(showId)
                .orElseThrow(() ->
                        new RuntimeException("Show not found"));

        Long bookedSeats = bookingRepository.getBookedSeats(showId);

        int availableSeats =
                show.getTotalSeats() - bookedSeats.intValue();

        if (seats <= 0) {
            throw new RuntimeException(
                    "Number of seats must be greater than 0");
        }

        if (seats > availableSeats) {
            throw new RuntimeException(
                    "Not enough seats available. Available seats: "
                            + availableSeats);
        }

        Booking booking = new Booking();

        booking.setStudent(student);
        booking.setShow(show);
        booking.setSeats(seats);
        booking.setStatus("CONFIRMED");

        return bookingRepository.save(booking);
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public Booking getBookingById(Long id) {

        return bookingRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Booking not found"));
    }

    @Transactional
    public Booking cancelBooking(Long id) {

        Booking booking = getBookingById(id);

        if ("CANCELLED".equals(booking.getStatus())) {
            throw new RuntimeException(
                    "Booking is already cancelled");
        }

        booking.setStatus("CANCELLED");

        return bookingRepository.save(booking);
    }

    public int getAvailableSeats(Long showId) {

        Show show = showRepository.findById(showId)
                .orElseThrow(() ->
                        new RuntimeException("Show not found"));

        Long bookedSeats =
                bookingRepository.getBookedSeats(showId);

        return show.getTotalSeats() - bookedSeats.intValue();
    }
}