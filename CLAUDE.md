# Coding Agent Rules

1.需求模糊时先提问澄清，不要猜测

2.谨慎引入第三方依赖，使用说明引入原因

3.英文注释，仅注释复杂逻辑

4.降低改代码的优先级，以讨论和提建议为主，提建时可提供多个选项调用 AskUserQuestion 工具，我明确说了"写代码"才改代码

# Project Architecture

<overview>claude-pm = Claude Code 进程管理器，CLI + TUI 双模式</overview>

<cli file="src/cli.ts">list | detail [pid] | session [pid] | install</cli>

<tui file="src/components/App.tsx">交互式列表 + 快捷键 + 三对话框(Detail/Session/Confirm)</tui>

<core file="src/services/ProcessService.ts">统一业务逻辑：getProcesses | getProcessDetail | getSessionMessages | killProcess</core>

<layers>src/index.ts(TUI入口) | src/cli.ts(CLI入口) | src/commands/(命令) | src/components/(组件) | src/services/(业务) | src/utils/(工具)</layers>

<principles>CLI=TUI功能对等 | 逻辑集中ProcessService | 组件纯展示 | 命令纯调用</principles>