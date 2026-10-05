import sys
import json
import time

def fetch_account(username):
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

        # 1. Fetch recent Feed Posts
        try:
            for idx, post in enumerate(profile.get_posts()):
                if idx >= 5:
                    break
                posts_checked += 1
                item_id = post.shortcode or str(post.mediaid)
                if item_id in seen_ids:
                    continue
                seen_ids.add(item_id)

                is_reel = post.is_video or getattr(post, 'typename', '') == 'GraphVideo'
                posts.append({
                    "id": item_id,
                    "postUrl": f"https://www.instagram.com/p/{post.shortcode}/" if not is_reel else f"https://www.instagram.com/reel/{post.shortcode}/",
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
                    if idx >= 5:
                        break
                    reels_checked += 1
                    item_id = reel.shortcode or str(reel.mediaid)
                    if item_id in seen_ids:
                        continue
                    seen_ids.add(item_id)

                    posts.append({
                        "id": item_id,
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
