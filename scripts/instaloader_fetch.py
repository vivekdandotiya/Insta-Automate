import sys
import json
import os
import time
import socket
from datetime import datetime, timezone, timedelta

# Set 15-second socket timeout globally so instaloader requests never hang indefinitely on socket read
socket.setdefaulttimeout(15)

def create_instaloader_instance():
    import instaloader
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        max_connection_attempts=1
    )
    
    # Disable internal Instaloader rate-controller sleeps so Node controls backoff timing exclusively
    if hasattr(L, 'rate_controller') and hasattr(L.rate_controller, 'sleep_time'):
        L.rate_controller.sleep_time = lambda *args, **kwargs: 0

    # Attach optional sessionid cookie if provided in environment
    session_id = os.environ.get('INSTAGRAM_SESSION_ID', '').strip() or os.environ.get('INSTAGRAM_SESSION_COOKIE', '').strip()
    if session_id:
        L.context._session.cookies.set('sessionid', session_id, domain='.instagram.com')

    return L

def fetch_account(username):
    POST_LIMIT = int(os.environ.get('INSTAGRAM_POST_LIMIT', '5'))
    REEL_LIMIT = int(os.environ.get('INSTAGRAM_REEL_LIMIT', '10'))

    try:
        import instaloader
        L = create_instaloader_instance()
        profile = instaloader.Profile.from_username(L.context, username)
        
        seen_ids = set()
        posts = []
        posts_checked = 0
        reels_checked = 0
        now_utc = datetime.now(timezone.utc)
        cutoff_24h = now_utc - timedelta(hours=36) # Safe 36h buffer to prevent timezone boundary cutoff

        # 1. Fetch recent Feed Posts
        try:
            for idx, post in enumerate(profile.get_posts()):
                if idx >= POST_LIMIT:
                    break
                posts_checked += 1
                item_id = post.shortcode or str(post.mediaid)
                if item_id in seen_ids:
                    continue
                seen_ids.add(item_id)

                pub_utc = post.date_utc.replace(tzinfo=timezone.utc) if post.date_utc else None
                # Stop if post is clearly older than cutoff
                if pub_utc and pub_utc < cutoff_24h:
                    break

                is_reel = post.is_video or getattr(post, 'typename', '') == 'GraphVideo'
                posts.append({
                    "id": item_id,
                    "shortcode": post.shortcode,
                    "postUrl": f"https://www.instagram.com/reel/{post.shortcode}/" if is_reel else f"https://www.instagram.com/p/{post.shortcode}/",
                    "caption": post.caption or "",
                    "publishedAt": post.date_utc.isoformat() + "Z" if post.date_utc else "",
                    "postType": "REEL" if is_reel else "POST"
                })
        except Exception as e:
            err_str = str(e).lower()
            if any(term in err_str for term in ["429", "401", "too many requests", "unauthorized", "please wait a few minutes", "rate limit"]):
                return {"success": False, "rateLimited": True, "httpStatus": 429, "error": "HTTP 429/401 Rate Limit on posts"}
            elif "timed out" in err_str or "timeout" in err_str:
                return {"success": False, "timedOut": True, "error": f"Socket timeout while reading posts for @{username}"}

        # 2. Fetch recent Reels tab explicitly if available
        try:
            if hasattr(profile, 'get_reels'):
                for idx, reel in enumerate(profile.get_reels()):
                    if idx >= REEL_LIMIT:
                        break
                    reels_checked += 1
                    item_id = reel.shortcode or str(reel.mediaid)
                    if item_id in seen_ids:
                        continue
                    seen_ids.add(item_id)

                    pub_utc = reel.date_utc.replace(tzinfo=timezone.utc) if reel.date_utc else None
                    if pub_utc and pub_utc < cutoff_24h:
                        break

                    posts.append({
                        "id": item_id,
                        "shortcode": reel.shortcode,
                        "postUrl": f"https://www.instagram.com/reel/{reel.shortcode}/",
                        "caption": reel.caption or "",
                        "publishedAt": reel.date_utc.isoformat() + "Z" if reel.date_utc else "",
                        "postType": "REEL"
                    })
        except Exception as e:
            err_str = str(e).lower()
            if any(term in err_str for term in ["429", "401", "too many requests", "unauthorized", "please wait a few minutes", "rate limit"]):
                return {"success": False, "rateLimited": True, "httpStatus": 429, "error": "HTTP 429/401 Rate Limit on reels"}
            elif "timed out" in err_str or "timeout" in err_str:
                return {"success": False, "timedOut": True, "error": f"Socket timeout while reading reels for @{username}"}

        return {
            "success": True,
            "username": username,
            "profileLookup": "SUCCESS",
            "postsChecked": posts_checked,
            "reelsChecked": reels_checked,
            "posts": posts
        }
    except Exception as e:
        err_str = str(e).lower()
        if any(term in err_str for term in ["429", "401", "too many requests", "unauthorized", "please wait a few minutes", "rate limit"]):
            return {"success": False, "rateLimited": True, "httpStatus": 429, "error": f"Instagram Access Restricted (401/429): {str(e)}"}
        elif "403" in err_str or "forbidden" in err_str:
            return {"success": False, "forbidden": True, "httpStatus": 403, "error": f"HTTP 403 Forbidden for @{username}"}
        elif "timed out" in err_str or "timeout" in err_str:
            return {"success": False, "timedOut": True, "error": f"Socket timeout for @{username}"}
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Username required"}))
        sys.exit(1)
    target_username = sys.argv[1].replace('@', '').strip()
    res = fetch_account(target_username)
    print(json.dumps(res))
