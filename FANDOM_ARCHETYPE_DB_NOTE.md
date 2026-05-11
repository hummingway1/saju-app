# Fandom Archetype DB Note

이번 패치의 핵심은 idol mode를 랜덤 추천이 아니라 **팬덤 archetype 매칭**으로 바꾼 것입니다.

## 구조
- `FANDOM_THEMES`: 그룹별 팬덤명, 색상, 시그니처 문구
- `IDOL_ARCHETYPE_DB`: 멤버별 tags, fanPattern
- `deriveUserArchetype(saju)`: 사주/오행/십성 힌트를 팬심 태그로 변환
- `scoreIdolByTags(userTags, idol)`: 사용자 태그와 멤버 태그를 점수화
- 선택 그룹이 있으면 반드시 그 그룹 안에서만 추천

## 주의
멤버 특성은 통계 데이터가 아니라 팬덤에서 흔히 소비되는 캐릭터성/대중 이미지 기반의 수동 태그입니다.
서비스 핵심은 “정답 맞히기”보다 “팬이 납득하는 bias pattern reveal”입니다.
