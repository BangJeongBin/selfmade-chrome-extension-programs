
(() => {
    "use strict";

    // ==========================================
    // 1. 감시 설정
	// 1.1. 변경 전 코드
	//	<div class="alert-card__gauge" aria-hidden="true">
    //		<img src="/ko/images/ncsc/alert-icon2.png" alt="관심단계">
	//	</div>
	//
	// 1.2. 변경 후 코드
	//	<div class="alert-card__gauge" aria-hidden="true">
    //		<img src="/ko/images/ncsc/alert-icon3.png" alt="관심단계">
	//	</div>
    // ==========================================

    const TARGET_SELECTOR =
        'div.alert-card__gauge[aria-hidden="true"] > img[alt="관심단계"]';

    const BEFORE_IMAGE =
        "/ko/images/ncsc/alert-icon2.png";

    const AFTER_IMAGE =
        "/ko/images/ncsc/alert-icon3.png";

    // 사이트 및 페이지별 독립 저장
    const STORAGE_KEY =
        "PAGE_MONITOR_" +
        location.origin +
        location.pathname;

    // ==========================================
    // 2. 내부 변수
    // ==========================================

    let processing = false;
    let pending = false;
    let alerted = false;
    let observer = null;

    // ==========================================
    // 3. 이미지 경로 확인
    // ==========================================

    function getImagePath(img) {
        if (!img) return null;

        const src = img.getAttribute("src");

        if (!src) return null;

        try {
            return new URL(src, location.href).pathname;

        } catch (error) {
            console.error("[PAGE Monitor] URL 오류:", error);
            return null;
        }
    }

    // ==========================================
    // 4. 변경 감지 팝업
    // ==========================================

    function showAlarm() {

        if (alerted) return;

        alerted = true;

        // 불필요한 감시 중단
        if (observer) {
            observer.disconnect();
        }

        alert(
            "================================\n" +
            "       PAGE ALERT DETECTED!\n" +
            "================================\n\n" +
            "경보단계 이미지 변경 감지!\n\n" +
            "변경 전:\n" +
            "관심\n\n" +
            "변경 후:\n" +
            "주의\n\n" +
            "NCSC 홈페이지를 확인하세요."
        );

    }

    // ==========================================
    // 5. 이미지 변경 여부 확인
    // ==========================================

    async function checkImage() {

        if (alerted) return;

        // 중복 실행 방지
        if (processing) {
            pending = true;
            return;
        }

        processing = true;

        try {
            const images = document.querySelectorAll(TARGET_SELECTOR);

            if (images.length === 0) {
                return;
            }

            if (images.length > 1) {
                console.warn("[PAGE Monitor] 감시 대상이 여러 개 발견됨:", images.length);
            }

            // 첫 번째 대상만 감시
            const img = images[0];

            const currentValue = getImagePath(img);

            if (!currentValue) {
                return;
            }

            // 이전 이미지 값 가져오기
            const result = await chrome.storage.local.get(
                STORAGE_KEY
            );

            const previousValue = result[STORAGE_KEY];

            // ----------------------------------
            // 최초 실행
            // ----------------------------------

            if (previousValue === undefined) {

                await chrome.storage.local.set({
                    [STORAGE_KEY]: currentValue
                });

                console.log(
                    "[PAGE Monitor] 최초 기준값 저장:",
                    currentValue
                );

                return;
            }

            // ----------------------------------
            // {기존 값} -> {변경 값} 감지
            // ----------------------------------

            if (
                previousValue === BEFORE_IMAGE &&
                currentValue === AFTER_IMAGE
            ) {

                // 알람 전에 변경된 상태부터 저장
                await chrome.storage.local.set({
                    [STORAGE_KEY]: currentValue
                });

                console.log(
                    "[PAGE Monitor] 이미지 변경 감지!"
                );

                showAlarm();

                return;
            }

            // ----------------------------------
            // 현재 이미지 상태 저장
            // ----------------------------------

            if (previousValue !== currentValue) {

                await chrome.storage.local.set({
                    [STORAGE_KEY]: currentValue
                });

                console.log(
                    "[PAGE Monitor] 상태 변경:",
                    previousValue,
                    "->",
                    currentValue
                );
            }

        } catch (error) {

            console.error("[PAGE Monitor] 처리 오류:", error);

        } finally {
            processing = false;

            if (pending && !alerted) {
                pending = false;
                checkImage();
            }
        }
    }

    // ==========================================
    // 6. 페이지 변경 감시
    // ==========================================

    function startMonitoring() {

        console.log("[PAGE Monitor] 감시 시작");

        // DOM 변경 감지
        observer = new MutationObserver(() => {
            checkImage();
        });

        observer.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    "src",
                    "alt",
                    "class",
                    "aria-hidden"
                ]
            }
        );

        // 최초 확인
        checkImage();

        // 1초 주기 보조 확인
        setInterval(() => {
            checkImage();
        }, 1000);
    }

    // ==========================================
    // 7. 실행
    // ==========================================

    startMonitoring();

})();
