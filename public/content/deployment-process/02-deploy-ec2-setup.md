# 2. EC2 서버 설정

배포를 진행하기 위한 EC2 인스턴스 생성 및 초기 설정 과정을 안내합니다.

## 1. EC2 인스턴스 생성

- **AMI (Amazon Machine Image):** `Ubuntu Server 22.04 LTS (HVM), SSD Volume Type`
- **인스턴스 유형:** `t3.micro` 또는 `t4g.small` (프로젝트 규모에 따라 선택)
- **키 페어:** SSH 접속을 위한 키 페어를 생성하거나 기존 키를 사용합니다.
- **네트워크 설정 (보안 그룹):**
    - `SSH (22)`: 내 IP에서만 접속 허용
    - `HTTP (80)`: 전체 오픈 (`0.0.0.0/0`)
    - `HTTPS (443)`: 전체 오픈 (`0.0.0.0/0`)
    - `TCP (8080)`: (선택) 애플리케이션 직접 접속 테스트용

## 2. EC2 초기 설정 스크립트

EC2 인스턴스에 처음 접속한 후, 아래 스크립트를 실행하여 개발 및 배포에 필요한 기본 도구들을 자동으로 설치합니다. 이 스크립트는 다음 작업을 수행합니다:

- `zsh`, `git`, `htop` 등 기본 패키지 설치
- `Oh My Zsh` 및 유용한 플러그인(`zsh-autosuggestions`, `zsh-syntax-highlighting`) 설치
- Docker 및 Docker Compose 설치 및 설정
- 현재 사용자를 `docker` 그룹에 추가하여 `sudo` 없이 Docker 명령 실행 권한 부여

```bash
# ==== Ubuntu (EC2) 자동 설치/설정 스크립트 ====
set -euxo pipefail

# 0) 기본 패키지
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl zsh git htop maven

# 1) Oh My Zsh 설치 (비대화형: RUNZSH/CHSH 막기)
export RUNZSH=no CHSH=no
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# 2) 플러그인 설치
ZSH_CUSTOM="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"
mkdir -p "$ZSH_CUSTOM/plugins"
git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions "$ZSH_CUSTOM/plugins/zsh-autosuggestions" || true
git clone --depth=1 https://github.com/zsh-users/zsh-syntax-highlighting "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" || true

# 3) .zshrc 자동 수정 (백업 후 plugins 라인 교체/추가)
cp ~/.zshrc{,.bak.$(date +%F_%T)}
if grep -qE '^\s*plugins=\(' ~/.zshrc; then
  sed -i -E 's/^\s*plugins=\(.*\)/plugins=(git zsh-autosuggestions zsh-syntax-highlighting)/' ~/.zshrc
else
  printf '\n# Oh My Zsh plugins\nplugins=(git zsh-autosuggestions zsh-syntax-highlighting)\n' >> ~/.zshrc
fi

# 4) 비번 없이 기본 쉘을 zsh로 바꾸기 (sudo 사용)
command -v zsh >/dev/null
grep -q "$(command -v zsh)" /etc/shells || echo "$(command -v zsh)" | sudo tee -a /etc/shells >/dev/null
sudo chsh -s "$(command -v zsh)" "$USER"

# 4.5) (공식 문서) Docker apt 저장소 이용 설치
#    - 충돌 패키지 제거
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt-get remove -y "$pkg" || true
done

#    - Docker GPG key & repo 등록
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

#    - Docker Engine + Compose 플러그인 설치
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

#    - 데몬 활성화
sudo systemctl enable --now docker

# (선택) docker를 sudo 없이 쓰려면 그룹 추가 (재로그인 필요)
sudo usermod -aG docker "$USER" || true

# 설치 확인 (재로그인 전이므로 sudo로 확인)
sudo docker --version
sudo docker compose version
sudo docker run --rm hello-world || true

# 5) 적용
# 스크립트 실행 완료 후, 터미널에 재접속(re-login)해야 zsh와 docker 그룹 설정이 완전히 적용됩니다.
echo "설치가 완료되었습니다. 터미널에 다시 접속해주세요."

```

> **참고:** 스크립트 마지막의 `usermod -aG docker "$USER"` 명령은 현재 사용자를 `docker` 그룹에 추가하는 것입니다. 이 설정은 터미널에 **재접속**해야만 적용되므로, 스크립트 실행 후 SSH 세션을 종료했다가 다시 연결해주세요.
