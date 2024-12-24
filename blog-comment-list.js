// ==UserScript==
// @name         Blog-Comment-list
// @namespace    http://tampermonkey.net/
// @version      2024-12-24
// @description  blog comment list
// @author       Noxa
// @match        https://admin.blog.naver.com/*/userfilter/commentlist
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==

// Extracts the post ID from a given address
function extractPostId(postAddr) {
    if (postAddr.includes('/nox-a/')) {
        return postAddr.split('/').pop(); // 포스트 번호
    } else if (postAddr.includes('guestbookNo=')) {
        return 'g' + new URL(postAddr).searchParams.get('guestbookNo'); // 안부글 번호
    } else {
        throw new Error('Unrecognized URL format');
    }
}

// 댓글 데이터를 추출하는 함수
function extractCommentData(tds) {
    const commentWriterArr = tds[1].innerText.split('\n').filter(line => line.trim() !== '');
    const commentWriter = `${commentWriterArr[0]}(${commentWriterArr[1]})`;

    const [postTitle, commentShort, commentTime] = tds[2].innerText.split('\n').filter(line => line.trim() !== '');
    const postAddr = tds[2].querySelector('a').href;
    const comment = tds[2].querySelector('span._replyRealContents').innerText;
    const postNo = extractPostId(postAddr);

    return {
        postTitle,
        postAddr,
        postNo,
        commentWriter,
        comment,
        commentTime
    };
}

// 댓글 데이터를 groupedComments 객체에 삽입하는 함수
function insertCommentToGroupedComments(groupedComments, commentData) {
    const { postNo, postTitle, postAddr, commentWriter, comment, commentTime } = commentData;

    if (!groupedComments[postNo]) {
        groupedComments[postNo] = {
            postTitle: postTitle,
            postAddr: postAddr,
            comments: []
        };
    }

    groupedComments[postNo].comments.push({
        commentWriter: commentWriter,
        comment: comment,
        commentTime: commentTime
    });
}


function processRow(row, groupedComments) {
    const tds = row.querySelectorAll('td');
    const commentData = extractCommentData(tds);
    insertCommentToGroupedComments(groupedComments, commentData);
}

// Processes the comment table and groups comments by post ID
function processCommentTable(commentTable) {
    const groupedComments = {};
    const rows = commentTable.querySelectorAll('tr');

    rows.forEach((row) => {
        processRow(row, groupedComments);
    });

    return groupedComments;
}

function getOptimizedCommentsTable(groupedComments,userID) {

    const table = document.createElement('table');
    table.classList.add('optimizedComments');

    // 테이블 내용 추가
    const tbody = table.createTBody();

    for (const postNo in groupedComments) {
        const post = groupedComments[postNo];
        if (tbody && tbody.querySelectorAll('tr').length > 0) {
            const sp = tbody.insertRow().insertCell()
            sp.classList.add('post-space');
            sp.colSpan=2;
        }

        const postTitleCell = tbody.insertRow().insertCell(); // 포스트 제목
        postTitleCell.textContent = post.postTitle;
        postTitleCell.colSpan = 2;
        postTitleCell.classList.add('post-title');
        postTitleCell.addEventListener('click', () => {
            window.open(post.postAddr, '_blank'); // 새 탭에서 링크 열기
        });

        post.comments.forEach(comment => { // 댓글 내용

            const row1 = tbody.insertRow();
            const row2 = tbody.insertRow();

            const r1c1 = row1.insertCell()
            r1c1.innerHTML = comment.commentWriter;
            r1c1.classList.add('comment-writer');

            const r1c2 = row1.insertCell()
            r1c2.innerHTML = comment.commentTime;
            r1c2.classList.add('comment-time');

            const r2c1 = row2.insertCell();
            r2c1.textContent = comment.comment;
            r2c1.colSpan = 2;
            r2c1.classList.add('comment-text');

            const commentClass = comment.commentWriter.split('(')[1] === userID+')' ? 'my' : 'other';
            row1.classList.add(commentClass);
            row2.classList.add(commentClass);

        });
    }
    const sp = tbody.insertRow().insertCell()
    sp.classList.add('post-space');
    sp.colSpan=2;

    return table

}


// 모달창 생성 함수
function createModalWithTable(table) {
    // 모달 HTML 구조 생성
    const modalHTML = `
        <div id="modal" class="modal">
            <div class="modal-content">
                <span id="closeModal" class="close">&times;</span>
                <h2 class="modal-title">댓글 목록</h2>
                <!-- 테이블을 여기 삽입 -->
                <div class="table-container"></div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const tableContainer = document.querySelector('.table-container');
    tableContainer.appendChild(table);

    // 모달 열기
    document.getElementById('modal').style.display = 'block';

    // 모달 닫기 버튼
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
    });

    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (e) => {
        if (e.target.id === 'modal') {
            document.getElementById('modal').style.display = 'none';
        }
    });

    insertModalStyles();
}

function insertModalStyles() {
    const styles = `
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 9999;
        }
        .modal-title {
            color: rgba(211, 188, 141, 1);
            font-size: 24px;
        }
        .modal-content {
            background-color: rgba(31, 31, 31, 1);

            padding: 20px;
            width: 80%;
            max-width: 800px;
            text-align: Left;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-height: 90%;
            overflow-y: auto;

        }
        .close {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 24px;
            cursor: pointer;
        }
        .table-container {
            background-color: rgba(42, 42, 42, 1);
            width: 100%;
            max-height: 85%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 20px;

        }
        .optimizedComments{
            background-color: rgba(31, 31, 31, 1);
            margin: 20px;
        }
        .optimizedComments tbody{
            color: rgba(211, 188, 141, 1);
            font-size: 14px;
        }
        .optimizedComments .my {
            color: rgba(211, 188, 141, 0.7);
            background-color: rgba(42, 42, 42, 1);
            border-inline: 3px solid rgba(211, 188, 141, 1);
        }
        .optimizedComments .other {
            background-color: rgba(31, 31, 31, 1);
            border-inline: 3px solid rgba(211, 188, 141, 1);
        }
        .optimizedComments .post-space {
            background-color: rgba(42, 42, 42, 1);
            border-top: 3px solid rgba(211, 188, 141, 1);
        }

        .optimizedComments .post-title {
            border: 3px solid rgba(211, 188, 141, 1);
            border-bottom: none;
            background-color: rgba(211, 188, 141, 1);
            color: rgba(31, 31, 31, 1);
            font-weight: bold;
        }

        .optimizedComments td.comment-text {
            border-bottom: 1px solid rgba(93, 90, 83, 1);
            padding: 1px 30px 40px 30px;
            min-height: 50px;
            display: flex
            width: 100%;
        }

        .optimizedComments .comment-time {
            text-align: right;
        }

        .optimizedComments td:not(.comment-text) {
            padding: 20px;
        }

    `;

    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}

// 모달을 다시 열기 위한 버튼 생성
function createReopenButton() {
    const button = document.createElement('button');
    button.id = 'openModalButton';
    button.textContent = '댓글 목록 보기';
    button.style.marginTop = '20px';
    button.style.padding = '10px 20px';
    button.style.fontSize = '16px';

    button.addEventListener('click', () => {
        let modal = document.getElementById('modal');
        modal.style.display = 'block';
    });

    document.querySelector('div.container__inner').appendChild(button);
}

window.onload = function() {
    createReopenButton();
};


(function() {
    'use strict';

    const iframe = document.querySelector('iframe.content_iframe');
    const userID = (window.location.href.match(/https:\/\/admin\.blog\.naver\.com\/([^\/]+)\/userfilter\/commentlist/) || [])[1] || "userID";
    console.log(userID);

    if (iframe) {
        iframe.onload = function() { // iframe이 로드 완료될때마다
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const commentTable = iframeDoc.querySelector('table.table3 tbody');

            if (commentTable) {
                const groupedComments = processCommentTable(commentTable);
                console.log(groupedComments);

                const table = getOptimizedCommentsTable(groupedComments,userID);
                const modal = document.getElementById('modal');
                if (modal) {
                    modal.remove(); // 이전 모달 삭제
                }
                insertModalStyles();
                createModalWithTable(table);

            } else {
                console.log("iframe 내에서 table.table3을 찾을 수 없음.");
            }
        };
    } else {
        console.log("iframe을 찾을 수 없음.");
    }


})();
