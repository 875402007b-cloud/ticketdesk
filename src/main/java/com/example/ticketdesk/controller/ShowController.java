package com.example.ticketdesk.controller;

import com.example.ticketdesk.entity.Show;
import com.example.ticketdesk.service.ShowService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shows")
@CrossOrigin(origins = "*")
public class ShowController {

    private final ShowService showService;

    public ShowController(ShowService showService) {
        this.showService = showService;
    }

    // CREATE SHOW
    @PostMapping
    public ResponseEntity<Show> createShow(
            @Valid @RequestBody Show show) {

        Show createdShow = showService.createShow(show);

        return new ResponseEntity<>(
                createdShow,
                HttpStatus.CREATED
        );
    }

    // GET ALL SHOWS
    @GetMapping
    public ResponseEntity<List<Show>> getAllShows() {

        return ResponseEntity.ok(
                showService.getAllShows()
        );
    }

    // GET SHOW BY ID
    @GetMapping("/{id}")
    public ResponseEntity<Show> getShowById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                showService.getShowById(id)
        );
    }

    // UPDATE SHOW
    @PutMapping("/{id}")
    public ResponseEntity<Show> updateShow(
            @PathVariable Long id,
            @Valid @RequestBody Show show) {

        return ResponseEntity.ok(
                showService.updateShow(id, show)
        );
    }

    // DELETE SHOW
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShow(
            @PathVariable Long id) {

        showService.deleteShow(id);

        return ResponseEntity.noContent().build();
    }

    // GET AVAILABLE SEATS
    @GetMapping("/{id}/available-seats")
    public ResponseEntity<Integer> getAvailableSeats(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                showService.getAvailableSeats(id)
        );
    }
}