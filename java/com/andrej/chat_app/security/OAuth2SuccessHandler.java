package com.andrej.chat_app.security;

import com.andrej.chat_app.model.Role;
import com.andrej.chat_app.model.User;
import com.andrej.chat_app.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        log.info("OAuth2 login for email: {}", email);

        // create username from email
        String username = email.split("@")[0].replaceAll("[^a-zA-Z0-9]", "");

        // find or create user
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setUsername(username);
            newUser.setEmail(email);
            newUser.setPassword("OAUTH2_USER");
            newUser.setRole(Role.CLIENT);
            newUser.setCreatedAt(LocalDateTime.now());
            newUser.setActive(true);
            User saved = userRepository.save(newUser);
            log.info("Created new OAuth2 user: {}", email);
            return saved;
        });

        // update last login
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // generate JWT and redirect to frontend
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());

        String redirectUrl = "http://localhost:3000/oauth2/callback?token=" + token
                + "&username=" + user.getUsername()
                + "&role=" + user.getRole().name();

        log.info("Redirecting to: {}", redirectUrl);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}