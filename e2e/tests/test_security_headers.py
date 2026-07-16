"""
Response header checks for the headers added in lib/chatsec_web/endpoint.ex.

`strict-transport-security` (HSTS) is intentionally NOT checked here: it's
only emitted when `force_ssl` is configured, which is only turned on in
config/prod.exs (dev deliberately skips it so you aren't forced onto HTTPS
redirects locally). See CLAUDE.md for how that's verified instead.
"""

CSP_DIRECTIVES = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
]


def test_csp_and_permissions_policy_on_a_normal_page(page, base_url):
    response = page.request.get(base_url + "/")
    headers = response.headers

    csp = headers.get("content-security-policy", "")
    for directive in CSP_DIRECTIVES:
        assert directive in csp, f"missing CSP directive: {directive}"
    assert "unsafe-inline" not in csp
    assert "unsafe-eval" not in csp

    permissions_policy = headers.get("permissions-policy", "")
    assert "camera=()" in permissions_policy
    assert "microphone=()" in permissions_policy
    assert "geolocation=()" in permissions_policy
    assert "clipboard-write=(self)" in permissions_policy

    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "SAMEORIGIN"


def test_headers_present_on_room_not_found_page(page, base_url):
    response = page.request.get(base_url + "/chat/does-not-exist")
    headers = response.headers
    assert "content-security-policy" in headers
    assert "permissions-policy" in headers


def test_headers_present_on_unmatched_404(page, base_url):
    """Regression check: error responses for routes that never matched must
    still carry the security headers, not just responses handled by the
    router's :browser pipeline."""
    response = page.request.get(base_url + "/this-route-does-not-exist")
    assert response.status == 404
    headers = response.headers
    assert "content-security-policy" in headers
    assert "permissions-policy" in headers


def test_no_csp_violations_reported_while_using_the_app(page, base_url):
    violations = []
    page.on(
        "console",
        lambda msg: violations.append(msg.text)
        if "Content Security Policy" in msg.text
        else None,
    )

    page.goto(base_url)
    page.click("#tell-me-more")
    page.click("#donate-button")
    page.click("#closeModalButton")
    page.click("#start-chat-button")
    page.get_by_placeholder("Username").fill("Playwright")
    page.click("#submitModalButton")
    page.click("#invite-button")

    assert not violations, f"CSP violations were reported: {violations}"
