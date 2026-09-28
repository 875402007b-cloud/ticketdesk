const API_BASE_URL = "http://localhost:8080";

async function request(url, options = {}) {

    try {

        const response = await fetch(API_BASE_URL + url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        let data = null;

        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {

            let message = "Request failed";

            if (typeof data === "object" && data !== null) {
                message = data.message || data.error || message;
            } else if (typeof data === "string" && data.trim() !== "") {
                message = data;
            }

            throw new Error(message);
        }

        return data;

    } catch (error) {

        console.error("API Error:", error);

        throw error;
    }
}


// ===============================
// SHOW APIs
// ===============================

export async function getShows() {
    return request("/api/shows");
}

export async function getShow(id) {
    return request(`/api/shows/${id}`);
}

export async function createShow(show) {

    return request("/api/shows", {
        method: "POST",
        body: JSON.stringify(show)
    });
}

export async function updateShow(id, show) {

    return request(`/api/shows/${id}`, {
        method: "PUT",
        body: JSON.stringify(show)
    });
}

export async function deleteShow(id) {

    return request(`/api/shows/${id}`, {
        method: "DELETE"
    });
}

export async function getAvailableSeats(id) {

    return request(`/api/shows/${id}/available-seats`);
}


// ===============================
// STUDENT APIs
// ===============================

export async function getStudents() {
    return request("/api/students");
}

export async function getStudent(id) {
    return request(`/api/students/${id}`);
}

export async function createStudent(student) {

    return request("/api/students", {
        method: "POST",
        body: JSON.stringify(student)
    });
}

export async function updateStudent(id, student) {

    return request(`/api/students/${id}`, {
        method: "PUT",
        body: JSON.stringify(student)
    });
}

export async function deleteStudent(id) {

    return request(`/api/students/${id}`, {
        method: "DELETE"
    });
}


// ===============================
// BOOKING APIs
// ===============================

export async function getBookings() {
    return request("/api/bookings");
}

export async function getBooking(id) {
    return request(`/api/bookings/${id}`);
}

export async function createBooking(booking) {

    return request("/api/bookings", {
        method: "POST",
        body: JSON.stringify(booking)
    });
}

export async function cancelBooking(id) {

    return request(`/api/bookings/${id}/cancel`, {
        method: "POST"
    });
}