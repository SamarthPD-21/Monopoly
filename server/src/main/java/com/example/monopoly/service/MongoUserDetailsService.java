package com.example.monopoly.service;

import com.example.monopoly.model.User;
import com.example.monopoly.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
public class MongoUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    public MongoUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String emailOrUsername) throws UsernameNotFoundException {
        // Try to find by email first, then by username
        User user = userRepository.findByEmail(emailOrUsername)
                .orElseGet(() -> userRepository.findByUsername(emailOrUsername)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found: " + emailOrUsername)));

        if (!user.isEnabled()) {
            throw new UsernameNotFoundException("User is disabled");
        }

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(new ArrayList<>())
                .build();
    }
}
