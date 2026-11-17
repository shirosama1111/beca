import json
import random
from pathlib import Path


UI_TEMPLATES = [
    {
        "title": "Dark mode text is unreadable",
        "description": "In dark mode, the text color is too close to the background and is hard to read.",
        "expected": "Text should maintain readable contrast in dark mode.",
        "actual": "The text appears almost invisible on dark backgrounds.",
        "domain": "ui",
    },
    {
        "title": "Vietnamese text is clipped in button labels",
        "description": "Vietnamese diacritics are cut off in some buttons and headings.",
        "expected": "Vietnamese characters should render completely and clearly.",
        "actual": "Characters such as ộ, ấ, and ủ are clipped or partially hidden.",
        "domain": "ui",
    },
    {
        "title": "Mobile navigation overlaps content",
        "description": "On small screens, the navigation bar covers the main page content.",
        "expected": "The layout should reserve space for content below the navigation bar.",
        "actual": "The navigation bar overlaps the text and blocks interaction.",
        "domain": "ui",
    },
    {
        "title": "Dropdown menu is cut off by its container",
        "description": "The country or category dropdown is clipped and the last items are not reachable.",
        "expected": "The dropdown should expand fully within the viewport and remain visible.",
        "actual": "The last options are hidden behind the container boundary.",
        "domain": "ui",
    },
    {
        "title": "Modal popup blocks the whole page",
        "description": "A pop-up remains on screen and blocks the rest of the application.",
        "expected": "The modal should close normally or stay within its intended area.",
        "actual": "The modal stays on top and blocks the page behind it.",
        "domain": "ui",
    },
    {
        "title": "Loading spinner never disappears after an error",
        "description": "After a failed request, the loading spinner remains visible indefinitely.",
        "expected": "The spinner should disappear when the request fails or times out.",
        "actual": "The spinner remains visible even after the request ends in error.",
        "domain": "ui",
    },
]

API_TEMPLATES = [
    {
        "title": "Reset link remains valid after use",
        "description": "A reset token still works after it has already been used once.",
        "expected": "The token should expire after the first successful use.",
        "actual": "The same reset link still works and allows repeated password changes.",
        "domain": "auth",
    },
    {
        "title": "Profile update returns stale data",
        "description": "The profile update endpoint returns the previous value after a successful mutation.",
        "expected": "The updated profile value should be saved and returned to the client.",
        "actual": "The server returns the old value even after the save completes successfully.",
        "domain": "account",
    },
    {
        "title": "Session stays valid after logout",
        "description": "The session remains active on the server even after the user logs out.",
        "expected": "The server should invalidate the session immediately after logout.",
        "actual": "The old token still grants access to protected pages.",
        "domain": "auth",
    },
    {
        "title": "API rejects valid request with blank optional field",
        "description": "The backend rejects a request when an optional field is left blank even though it should be treated as empty.",
        "expected": "The API should accept the optional blank value without failing.",
        "actual": "The server returns a validation error when the field is blank.",
        "domain": "api",
    },
    {
        "title": "Unauthorized error appears shortly after token refresh",
        "description": "The session is valid for a short time after the token has expired and the client receives 401s.",
        "expected": "The API should return the refreshed token or a proper retry pattern without false unauthorized errors.",
        "actual": "Requests intermittently fail with 401s right after token expiry.",
        "domain": "auth",
    },
    {
        "title": "Search endpoint returns empty results for accented characters",
        "description": "Requests that include accented text like café or phở bò return an empty list although data exists.",
        "expected": "The backend should normalize accented strings during search.",
        "actual": "The search endpoint ignores valid accented characters and returns no results.",
        "domain": "search",
    },
]

LOGIC_TEMPLATES = [
    {
        "title": "Checkout total is off by 0.01",
        "description": "The checkout total differs from the sum of line items by 0.01.",
        "expected": "The total should match the invoice and the original calculation exactly.",
        "actual": "The final total is lower or higher by one cent.",
        "domain": "checkout",
    },
    {
        "title": "Coupon is applied twice",
        "description": "Applying a valid coupon reduces the total more than expected.",
        "expected": "The discount should be applied once only.",
        "actual": "The same discount is applied twice and the total becomes too low.",
        "domain": "billing",
    },
    {
        "title": "Stock shows negative inventory after flash sale",
        "description": "The product stock count becomes negative after a limited special promotion.",
        "expected": "The inventory should never go below zero.",
        "actual": "The system logs stock as negative and allows overselling.",
        "domain": "inventory",
    },
    {
        "title": "Pagination duplicates rows between pages",
        "description": "Some records appear on both page 1 and page 2 of the list.",
        "expected": "Every record should appear only once across all pages.",
        "actual": "Rows are duplicated across adjacent pages.",
        "domain": "pagination",
    },
    {
        "title": "Filter combines conditions with OR instead of AND",
        "description": "Selecting two filters returns items that match only one condition.",
        "expected": "The filter should apply both conditions together.",
        "actual": "The result set behaves as an OR query instead of an AND query.",
        "domain": "search",
    },
    {
        "title": "Renewal date shifts to the wrong day after month end",
        "description": "A renewal or subscription date changes to the wrong day after a month-end boundary.",
        "expected": "The date should remain consistent with the subscribed month.",
        "actual": "The renewal date is shifted to the previous or next day unexpectedly.",
        "domain": "billing",
    },
]

TEMPLATES = {"UI": UI_TEMPLATES, "API": API_TEMPLATES, "LOGIC": LOGIC_TEMPLATES}
SEVERITY_MAP = {
    "UI": ["LOW", "MEDIUM"],
    "API": ["HIGH", "CRITICAL"],
    "LOGIC": ["MEDIUM", "HIGH"],
}


def build_steps(domain: str) -> list[str]:
    if domain == "ui":
        return [
            "Open the affected page",
            "Trigger the UI action",
            "Observe the visible result",
        ]
    if domain in {"auth", "account", "api"}:
        return [
            "Open the relevant page or endpoint",
            "Submit the affected request",
            "Inspect the returned state",
        ]
    if domain in {"checkout", "billing", "inventory", "pagination", "search"}:
        return [
            "Prepare the input data",
            "Trigger the action or filter",
            "Check the final result and state",
        ]
    return ["Open the relevant workflow", "Perform the action", "Verify the outcome"]


def generate_dataset(output_path: Path) -> None:
    rng = random.Random(42)
    rows = []

    labels = ["UI", "LOGIC", "API"]
    weights = [45, 35, 20]

    for i in range(1, 1001):
        label = rng.choices(labels, weights=weights, k=1)[0]
        template = rng.choice(TEMPLATES[label])
        severity = rng.choice(SEVERITY_MAP[label])
        domain = template["domain"]
        split = "train" if i <= 700 else "val" if i <= 850 else "test"
        language = rng.choice(["en", "vi"])

        row = {
            "bug_id": f"BUG-SYN-{i:04d}",
            "bug_title": template["title"],
            "bug_description": template["description"],
            "steps_to_reproduce": build_steps(domain),
            "expected_behavior": template["expected"],
            "actual_behavior": template["actual"],
            "ground_truth_label": label,
            "severity": severity,
            "metadata": {
                "split": split,
                "source": "synthetic",
                "language": language,
                "domain": domain,
            },
        }
        rows.append(row)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Generated {len(rows)} rows to {output_path}")


if __name__ == "__main__":
    generate_dataset(Path(__file__).with_name("bug_dataset_1000_synthetic.jsonl"))
