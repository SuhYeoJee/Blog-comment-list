import requests
from flask import Flask, request, redirect, jsonify
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

# 네이버 OAuth2.0 클라이언트 정보 (여기에 값만 수정하면 됩니다)
CLIENT_ID = 'GwI31SM1lPymfnTfO99h'  # 네이버에서 발급받은 Client ID
CLIENT_SECRET = 'dUIO5HnZMa'  # 네이버에서 발급받은 Client Secret
REDIRECT_URI = 'http://localhost:5000/callback'  # 로컬 서버 콜백 URI

CLIENT_ID = 'CLIENT_ID'  # 네이버에서 발급받은 Client ID
CLIENT_SECRET = 'CLIENT_SECRET'  # 네이버에서 발급받은 Client Secret
REDIRECT_URI = 'http://localhost:5000/callback'  # 로컬 서버 콜백 URI


app = Flask(__name__)

# 네이버 로그인 페이지로 리디렉션
@app.route('/')
def index():
    auth_url = 'https://nid.naver.com/oauth2.0/authorize'
    params = {
        'response_type': 'code',
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'state': 'random_state_string',  # CSRF 방지용
    }
    # URL 인코딩 후 리디렉션
    return redirect(f'{auth_url}?{urlencode(params)}')

# 네이버 인증 후 리디렉션된 콜백 처리
@app.route('/callback')
def callback():
    # 네이버에서 전달한 `code`와 `state` 값 받기
    code = request.args.get('code')
    state = request.args.get('state')

    if code:
        # `code`를 사용해 액세스 토큰 요청
        token_url = 'https://nid.naver.com/oauth2.0/token'
        token_params = {
            'grant_type': 'authorization_code',
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'code': code,
            'redirect_uri': REDIRECT_URI
        }

        response = requests.post(token_url, data=token_params)
        token_data = response.json()  # JSON 응답 파싱

        # 액세스 토큰과 기타 정보 출력
        if 'access_token' in token_data:
            access_token = token_data['access_token']
            print(access_token)
            # Playwright를 사용하여 웹 자동화
            result = run_playwright_with_token(access_token)
            return jsonify(result)
        else:
            return "Error: No access token received"
    else:
        return "Error: Code not found"

# 액세스 토큰을 사용하여 Playwright 실행
def run_playwright_with_token(access_token):
    # 액세스 토큰을 사용하여 대상 URL 생성
    target_url = f"https://admin.blog.naver.com/nox-a/userfilter/commentlist#access_token={access_token}&state=random_state_string&token_type=bearer&expires_in=3600"
    print(f"Access Token을 사용하여 이동할 URL: {target_url}")

    # Playwright 실행
    with sync_playwright() as p:
        # Chromium 브라우저 실행
        browser = p.chromium.launch(headless=True)  # headless=True로 실행 (UI 안보임)
        page = browser.new_page()

        # 해당 URL로 이동
        page.goto(target_url)

        # 예시: 페이지의 타이틀을 가져오기
        title = page.title()

        # 페이지 내용 추출 (예: 페이지에서 특정 텍스트를 찾기)
        page_content = page.content()

        browser.close()

    # 결과 반환
    return {
        "title": title,
        "content": page_content
    }

if __name__ == '__main__':
    app.run(debug=True)


'''
플라스크 서버에서
계속 리퀘스트로 토큰 먹어다가 
댓리 주소로 접속

get - 스크립트 실행 안돼서 리다이렉트 코드 뜸
playwright - 스크립트 되는데 토큰이 적용 안되고 로그인 페이지 코드 뜸

근데 링크타고 파이어폭스에서 열면 제대로 접속 되거든 
근데 엣지에서 열면 로그인 페이지 뜸
결국 세션문제인거같은데

내가 뭘 할 수 있는지를 몰라서 못하겠네
확실한거는 그럼 저 뭐야 셀레니움으로 열어도 해결 못함
local페이지 연거랑 같은걸로 열어야함

그래서 세개 다 playwright로 해보자고.

근데 그럼 어차피 서버를 돌릴거면 셀레니움으로 자동 로그인 해도 되지않냐
아 그러네 

'''