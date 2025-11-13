package com.example.monopoly.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.example.monopoly.security.JwtAuthFilter;
import com.example.monopoly.service.MongoUserDetailsService;

@Configuration
public class SecurityConfig {
    private final MongoUserDetailsService userDetailsService;

    public SecurityConfig(MongoUserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(request -> {
                var cfg = new org.springframework.web.cors.CorsConfiguration();
                cfg.setAllowedOrigins(java.util.List.of("http://localhost:3000"));
                cfg.setAllowedMethods(java.util.List.of("GET","POST","PUT","DELETE","OPTIONS"));
                cfg.setAllowedHeaders(java.util.List.of("*"));
                cfg.setAllowCredentials(true);
                cfg.setMaxAge(3600L);
                return cfg;
            }))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/", "/index.html", "/static/**", "/favicon.ico", "/auth/**").permitAll()
                .requestMatchers("/game").permitAll() // Allow WebSocket connections
                .anyRequest().authenticated()
            )
            .formLogin(Customizer.withDefaults())
            .httpBasic(Customizer.withDefaults());

        // JWT filter
        http.addFilterBefore(new JwtAuthFilter(userDetailsService), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    // Provide a global CORS configuration source and filter to ensure preflight responses
    @Bean
    @Primary
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        var cfg = new org.springframework.web.cors.CorsConfiguration();
        cfg.setAllowedOrigins(java.util.List.of("http://localhost:3000"));
        cfg.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(java.util.List.of("*"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);
        var src = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }

    @Bean
    public org.springframework.web.filter.CorsFilter corsFilter(org.springframework.web.cors.CorsConfigurationSource source) {
        return new org.springframework.web.filter.CorsFilter(source);
    }

    // Register the CORS filter with highest precedence so preflight requests are handled
    @Bean
    public org.springframework.boot.web.servlet.FilterRegistrationBean<org.springframework.web.filter.CorsFilter> corsFilterRegistration(org.springframework.web.cors.CorsConfigurationSource source) {
        var fr = new org.springframework.boot.web.servlet.FilterRegistrationBean<org.springframework.web.filter.CorsFilter>(new org.springframework.web.filter.CorsFilter(source));
        fr.setOrder(org.springframework.core.Ordered.HIGHEST_PRECEDENCE);
        fr.addUrlPatterns("/*");
        return fr;
    }
}
