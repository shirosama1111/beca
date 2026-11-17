package com.example.bugreport.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtFilter jwtFilter;
    @Bean public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable()).cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/", "/index.html", "/static/**", "/*.js", "/*.css").permitAll()
                        .requestMatchers("/api/admin/ai/**", "/api/admin/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/reports").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/reports/*/ai-analysis").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/reports/my").authenticated()
                        .requestMatchers("/api/reports/stats/**", "/api/reports/unassigned").hasAnyRole("DEVELOPER", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/reports/**").hasAnyRole("DEVELOPER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/reports/**").hasAnyRole("DEVELOPER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/reports/*/status", "/api/reports/*/assign").hasAnyRole("DEVELOPER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/reports/*/comments").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/reports/**").authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration(); config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")); config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization")); config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**", config); return source;
    }
}
