package com.example.ticketdesk.service;

import com.example.ticketdesk.entity.Show;
import com.example.ticketdesk.repository.BookingRepository;
import com.example.ticketdesk.repository.ShowRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ShowService {

    private final ShowRepository showRepository;
    private final BookingRepository bookingRepository;

    public ShowService(
            ShowRepository showRepository,
            BookingRepository bookingRepository) {

        this.showRepository = showRepository;
        this.bookingRepository = bookingRepository;
    }

    // ==============================
    // CREATE SHOW
    // ==============================

    public Show createShow(Show show) {

        return showRepository.save(show);
    }

    // ==============================
    // GET ALL SHOWS
    // ==============================

    public List<Show> getAllShows() {

        return showRepository.findAll();
    }

    // ==============================
    // GET SHOW BY ID
    // ==============================

    public Show getShowById(Long id) {

        return showRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Show not found with id: " + id));
    }

    // ==============================
    // UPDATE SHOW
    // ==============================

    public Show updateShow(Long id, Show updatedShow) {

        Show existingShow = showRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Show not found with id: " + id));

        existingShow.setTitle(updatedShow.getTitle());

        existingShow.setShowTime(updatedShow.getShowTime());

        existingShow.setTotalSeats(updatedShow.getTotalSeats());

        return showRepository.save(existingShow);
    }

    // ==============================
    // DELETE SHOW
    // ==============================

    public void deleteShow(Long id) {

        if (!showRepository.existsById(id)) {

            throw new RuntimeException(
                    "Show not found with id: " + id);
        }

        showRepository.deleteById(id);
    }

    // ==============================
    // GET AVAILABLE SEATS
    // ==============================

    public int getAvailableSeats(Long showId) {

        Show show = showRepository.findById(showId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Show not found with id: " + showId));

        Long bookedSeats =
                bookingRepository.getBookedSeats(showId);

        if (bookedSeats == null) {
            bookedSeats = 0L;
        }

        return show.getTotalSeats() - bookedSeats.intValue();
    }
}