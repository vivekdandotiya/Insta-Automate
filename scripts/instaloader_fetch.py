import sys
import json
import os
import time
from datetime import datetime, timezone, timedelta

def fetch_account(username):
    POST_LIMIT = int(os.environ.get('INSTAGRAM_POST_LIMIT', '5'))
    REEL_LIMIT = int(os.environ.get('INSTAGRAM_REEL_LIMIT', '10'))

    try:
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
            if "429" in err_str or "too many requests" in err_str:
                return {"success": False, "rateLimited": True, "error": "HTTP 429 Too Many Requests"}

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
            if "429" in err_str or "too many requests" in err_str:
                return {"success": False, "rateLimited": True, "error": "HTTP 429 Too Many Requests"}

        return {
            "success": True,
            "username": username,
            "postsChecked": posts_checked,
            "reelsChecked": reels_checked,
            "posts": posts
        }
    except Exception as e:
        err_str = str(e).lower()
        if "429" in err_str or "too many requests" in err_str or "rate limit" in err_str:
            return {"success": False, "rateLimited": True, "error": "HTTP 429 Too Many Requests"}
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Username required"}))
        sys.exit(1)
    target_username = sys.argv[1].replace('@', '').strip()
    res = fetch_account(target_username)
    print(json.dumps(res))
