package auth

import (
	"sync"
	"time"
)

type RateLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
	now    func() time.Time
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{hits: map[string][]time.Time{}, limit: limit, window: window, now: time.Now}
}

func (r *RateLimiter) Allow(ip string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := r.now()
	cutoff := now.Add(-r.window)
	kept := r.hits[ip][:0]
	for _, t := range r.hits[ip] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= r.limit {
		if len(kept) == 0 {
			delete(r.hits, ip)
		} else {
			r.hits[ip] = kept
		}
		return false
	}
	if len(kept) == 0 && len(r.hits[ip]) > 0 {
		delete(r.hits, ip)
		kept = nil
	}
	r.hits[ip] = append(kept, now)
	if len(r.hits) > 10000 {
		for key, times := range r.hits {
			if len(times) == 0 || !times[len(times)-1].After(cutoff) {
				delete(r.hits, key)
			}
		}
	}
	return true
}
