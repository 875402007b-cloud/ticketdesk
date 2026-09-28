package com.example.ticketdesk.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne
    @JoinColumn(name = "show_id", nullable = false)
    private Show show;

    @NotNull(message = "Number of seats is required")
    @Positive(message = "Number of seats must be greater than 0")
    private Integer seats;

    private String status;

    public Booking() {
    }

    public Booking(
            Student student,
            Show show,
            Integer seats,
            String status) {

        this.student = student;
        this.show = show;
        this.seats = seats;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public Student getStudent() {
        return student;
    }

    public Show getShow() {
        return show;
    }

    public Integer getSeats() {
        return seats;
    }

    public String getStatus() {
        return status;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public void setShow(Show show) {
        this.show = show;
    }

    public void setSeats(Integer seats) {
        this.seats = seats;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}