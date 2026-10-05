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
        posts = []
        for idx, post in enumerate(profile.get_posts()):
            if idx >= 5:
                break
            posts.append({
                "id": post.shortcode or str(post.mediaid),
                "postUrl": f"https://www.instagram.com/p/{post.shortcode}/",
                "caption": post.caption or "",
                "publishedAt": post.date_utc.isoformat() + "Z" if post.date_utc else "",
                "postType": "REEL" if post.is_video else "POST"
            })
        return {"success": True, "username": username, "posts": posts}
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
