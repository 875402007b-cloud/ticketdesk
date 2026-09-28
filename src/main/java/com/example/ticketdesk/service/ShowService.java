package com.example.ticketdesk.service;

import com.example.ticketdesk.entity.Show;
import com.example.ticketdesk.repository.ShowRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ShowService {

    private final ShowRepository showRepository;

    public ShowService(ShowRepository showRepository) {
        this.showRepository = showRepository;
    }

    public Show createShow(Show show) {
        return showRepository.save(show);
    }

    public List<Show> getAllShows() {
        return showRepository.findAll();
    }

    public Show getShowById(Long id) {
        return showRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Show not found"));
    }

    public Show updateShow(Long id, Show updatedShow) {

        Show existingShow = getShowById(id);

        existingShow.setTitle(updatedShow.getTitle());
        existingShow.setShowTime(updatedShow.getShowTime());
        existingShow.setTotalSeats(updatedShow.getTotalSeats());

        return showRepository.save(existingShow);
    }

    public void deleteShow(Long id) {
        Show show = getShowById(id);
        showRepository.delete(show);
    }
}