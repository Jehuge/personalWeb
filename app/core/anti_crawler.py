"""
反爬虫中间件
提供速率限制、User-Agent检查等功能
"""
from fastapi import Request, HTTPException, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Optional, List
import re

# 初始化速率限制器
limiter = Limiter(key_func=get_remote_address)

# 常见的爬虫User-Agent列表
CRAWLER_USER_AGENTS = [
    r'bot',
    r'crawler',
    r'spider',
    r'scraper',
    r'curl',
    r'wget',
    r'python',
    r'java',
    r'go-http',
    r'php',
    r'ruby',
    r'perl',
    r'scrapy',
    r'requests',
    r'urllib',
    r'okhttp',
    r'apache',
    r'nutch',
    r'baiduspider',
    r'googlebot',
    r'bingbot',
    r'yandexbot',
    r'slurp',
    r'duckduckbot',
    r'facebookexternalhit',
    r'twitterbot',
    r'rogerbot',
    r'linkedinbot',
    r'embedly',
    r'quora',
    r'showyoubot',
    r'outbrain',
    r'pinterest',
    r'slackbot',
    r'vkShare',
    r'redditbot',
    r'Applebot',
    r'WhatsApp',
    r'flipboard',
    r'tumblr',
    r'bitlybot',
    r'SkypeUriPreview',
    r'nuzzel',
    r'Discordbot',
    r'Google Page Speed',
    r'Qwantify',
    r'pinterestbot',
    r'Bitrix link preview',
    r'XING-contenttabreceiver',
    r'Chrome-Lighthouse',
    r'TelegramBot',
    r'AhrefsBot',
    r'SemrushBot',
    r'MJ12bot',
    r'DotBot',
    r'Barkrowler',
    r'BLEXBot',
    r'CCBot',
    r'GPTBot',
    r'ChatGPT-User',
    r'Claude-Web',
    r'ClaudeBot',
    r'PerplexityBot',
    r'YouBot',
    r'Applebot-Extended',
    r'Omgilibot',
    r'FacebookBot',
    r'ia_archiver',
    r'archive.org_bot',
    r'Baiduspider',
    r'BingPreview',
    r'Googlebot',
    r'Googlebot-Image',
    r'Googlebot-News',
    r'Googlebot-Video',
    r'Mediapartners-Google',
    r'AdsBot-Google',
    r'Feedfetcher-Google',
    r'Google-Read-Aloud',
    r'DuplexWeb-Google',
    r'Storebot-Google',
    r'Bytespider',
    r'YisouSpider',
    r'Yandex',
    r'YandexBot',
    r'YandexAccessibilityBot',
    r'YandexMobileBot',
    r'YandexDirectDyn',
    r'YandexScreenshotBot',
    r'YandexImages',
    r'YandexVideo',
    r'YandexVideoParser',
    r'YandexMedia',
    r'YandexBlogs',
    r'YandexFavicons',
    r'YandexWebmaster',
    r'YandexPagechecker',
    r'YandexImageResizer',
    r'YaDirectFetcher',
    r'YandexCalendar',
    r'YandexSitelinks',
    r'YandexMetrika',
    r'YandexNews',
    r'YandexAntivirus',
    r'YandexMarket',
    r'YandexVertis',
    r'YandexForDomain',
    r'YandexSpravBot',
    r'YandexSearchShop',
    r'YandexMedianaBot',
    r'YandexOntoDB',
    r'YandexOntoDBAPI',
    r'YandexTurbo',
    r'YandexVerticals',
    r'Sogou',
    r'Exabot',
    r'facebot',
    r'ia_archiver',
    r'Slackbot',
    r'Twitterbot',
    r'facebookexternalhit',
    r'LinkedInBot',
    r'WhatsApp',
    r'SkypeUriPreview',
    r'Applebot',
    r'Yahoo! Slurp',
    r'Bingbot',
    r'BingPreview',
    r'msnbot',
    r'DuckDuckBot',
    r'Baiduspider',
    r'YisouSpider',
    r'Sogou',
    r'Exabot',
    r'facebot',
    r'ia_archiver',
    r'Slackbot',
    r'Twitterbot',
    r'facebookexternalhit',
    r'LinkedInBot',
    r'WhatsApp',
    r'SkypeUriPreview',
    r'Applebot',
    r'Yahoo! Slurp',
    r'Bingbot',
    r'BingPreview',
    r'msnbot',
    r'DuckDuckBot',
    r'Baiduspider',
    r'YisouSpider',
    r'Sogou',
    r'Exabot',
    r'facebot',
    r'ia_archiver',
    r'Slackbot',
    r'Twitterbot',
    r'facebookexternalhit',
    r'LinkedInBot',
    r'WhatsApp',
    r'SkypeUriPreview',
    r'Applebot',
    r'Yahoo! Slurp',
    r'Bingbot',
    r'BingPreview',
    r'msnbot',
    r'DuckDuckBot',
]

# 允许的搜索引擎爬虫（白名单）
ALLOWED_CRAWLERS = [
    r'Googlebot',
    r'Bingbot',
    r'Slurp',
    r'DuckDuckBot',
    r'Baiduspider',
    r'YandexBot',
    r'Sogou',
    r'Exabot',
    r'facebookexternalhit',
    r'Twitterbot',
    r'LinkedInBot',
    r'Applebot',
    r'Yahoo! Slurp',
    r'msnbot',
]


def is_crawler_user_agent(user_agent: Optional[str], allow_empty: bool = False) -> bool:
    """
    检查User-Agent是否为爬虫
    
    Args:
        user_agent: User-Agent字符串
        allow_empty: 是否允许空的User-Agent
        
    Returns:
        bool: 如果是爬虫返回True，否则返回False
    """
    if not user_agent:
        return not allow_empty  # 根据配置决定是否将空User-Agent视为可疑
    
    user_agent_lower = user_agent.lower()
    
    # 先检查是否在白名单中（允许的搜索引擎爬虫）
    for allowed_pattern in ALLOWED_CRAWLERS:
        if re.search(allowed_pattern, user_agent, re.IGNORECASE):
            return False  # 在白名单中，不是恶意爬虫
    
    # 检查是否为已知的爬虫User-Agent
    for crawler_pattern in CRAWLER_USER_AGENTS:
        if re.search(crawler_pattern, user_agent_lower):
            return True  # 匹配到爬虫模式
    
    return False


async def check_user_agent_middleware(request: Request, call_next):
    """
    User-Agent检查中间件
    检查请求的User-Agent，如果是可疑的爬虫则拒绝请求
    """
    from app.core.config import settings
    
    user_agent = request.headers.get("user-agent")
    
    # 检查是否为爬虫
    if is_crawler_user_agent(user_agent, allow_empty=settings.ALLOW_EMPTY_USER_AGENT):
        # 对于可疑的爬虫，返回403错误
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Crawler detected"
        )
    
    response = await call_next(request)
    return response


def get_rate_limit_key(request: Request) -> str:
    """
    获取速率限制的键值
    优先使用IP地址，如果无法获取则使用User-Agent
    """
    # 尝试从X-Forwarded-For获取真实IP（如果使用反向代理）
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For可能包含多个IP，取第一个
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = get_remote_address(request)
    
    return client_ip

