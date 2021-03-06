/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IScrollPosition, Scrollable } from 'vs/base/common/scrollable';
import * as strings from 'vs/base/common/strings';
import { IViewLineTokens } from 'vs/editor/common/core/lineTokens';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { INewScrollPosition, ScrollType } from 'vs/editor/common/editorCommon';
import { EndOfLinePreference, IActiveIndentGuideInfo, IModelDecorationOptions, TextModelResolvedOptions, ITextModel } from 'vs/editor/common/model';
import { IViewEventEmitter, VerticalRevealType } from 'vs/editor/common/view/viewEvents';
import { IPartialViewLinesViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { IEditorWhitespace, IWhitespaceChangeAccessor } from 'vs/editor/common/viewLayout/linesLayout';
import { EditorTheme } from 'vs/editor/common/view/viewContext';
import { ICursorSimpleModel, PartialCursorState, CursorState, IColumnSelectData, EditOperationType, CursorConfiguration } from 'vs/editor/common/controller/cursorCommon';
import { CursorChangeReason } from 'vs/editor/common/controller/cursorEvents';

export interface IViewWhitespaceViewportData {
	readonly id: string;
	readonly afterLineNumber: number;
	readonly verticalOffset: number;
	readonly height: number;
}

export class Viewport {
	readonly _viewportBrand: void;

	readonly top: number;
	readonly left: number;
	readonly width: number;
	readonly height: number;

	constructor(top: number, left: number, width: number, height: number) {
		this.top = top | 0;
		this.left = left | 0;
		this.width = width | 0;
		this.height = height | 0;
	}
}

export interface IViewLayout {

	getScrollable(): Scrollable;

	onMaxLineWidthChanged(width: number): void;

	getScrollWidth(): number;
	getScrollHeight(): number;

	getCurrentScrollLeft(): number;
	getCurrentScrollTop(): number;
	getCurrentViewport(): Viewport;

	getFutureViewport(): Viewport;

	validateScrollPosition(scrollPosition: INewScrollPosition): IScrollPosition;
	setScrollPosition(position: INewScrollPosition, type: ScrollType): void;
	deltaScrollNow(deltaScrollLeft: number, deltaScrollTop: number): void;

	getLinesViewportData(): IPartialViewLinesViewportData;
	getLinesViewportDataAtScrollTop(scrollTop: number): IPartialViewLinesViewportData;
	getWhitespaces(): IEditorWhitespace[];

	isAfterLines(verticalOffset: number): boolean;
	getLineNumberAtVerticalOffset(verticalOffset: number): number;
	getVerticalOffsetForLineNumber(lineNumber: number): number;
	getWhitespaceAtVerticalOffset(verticalOffset: number): IViewWhitespaceViewportData | null;

	// --------------- Begin vertical whitespace management
	changeWhitespace<T>(callback: (accessor: IWhitespaceChangeAccessor) => T): T;

	/**
	 * Get the layout information for whitespaces currently in the viewport
	 */
	getWhitespaceViewportData(): IViewWhitespaceViewportData[];

	// TODO@Alex whitespace management should work via a change accessor sort of thing
	onHeightMaybeChanged(): void;

	// --------------- End vertical whitespace management
}

export interface ICoordinatesConverter {
	// View -> Model conversion and related methods
	convertViewPositionToModelPosition(viewPosition: Position): Position;
	convertViewRangeToModelRange(viewRange: Range): Range;
	validateViewPosition(viewPosition: Position, expectedModelPosition: Position): Position;
	validateViewRange(viewRange: Range, expectedModelRange: Range): Range;

	// Model -> View conversion and related methods
	convertModelPositionToViewPosition(modelPosition: Position): Position;
	convertModelRangeToViewRange(modelRange: Range): Range;
	modelPositionIsVisible(modelPosition: Position): boolean;
}

export interface IViewModel extends IViewEventEmitter, ICursorSimpleModel {

	readonly model: ITextModel;

	readonly coordinatesConverter: ICoordinatesConverter;

	readonly viewLayout: IViewLayout;

	readonly cursorConfig: CursorConfiguration;

	/**
	 * Gives a hint that a lot of requests are about to come in for these line numbers.
	 */
	setViewport(startLineNumber: number, endLineNumber: number, centeredLineNumber: number): void;
	tokenizeViewport(): void;
	setHasFocus(hasFocus: boolean): void;

	getDecorationsInViewport(visibleRange: Range): ViewModelDecoration[];
	getViewLineRenderingData(visibleRange: Range, lineNumber: number): ViewLineRenderingData;
	getViewLineData(lineNumber: number): ViewLineData;
	getMinimapLinesRenderingData(startLineNumber: number, endLineNumber: number, needed: boolean[]): MinimapLinesRenderingData;
	getCompletelyVisibleViewRange(): Range;
	getCompletelyVisibleViewRangeAtScrollTop(scrollTop: number): Range;

	getTextModelOptions(): TextModelResolvedOptions;
	getLineCount(): number;
	getLineContent(lineNumber: number): string;
	getLineLength(lineNumber: number): number;
	getActiveIndentGuide(lineNumber: number, minLineNumber: number, maxLineNumber: number): IActiveIndentGuideInfo;
	getLinesIndentGuides(startLineNumber: number, endLineNumber: number): number[];
	getLineMinColumn(lineNumber: number): number;
	getLineMaxColumn(lineNumber: number): number;
	getLineFirstNonWhitespaceColumn(lineNumber: number): number;
	getLineLastNonWhitespaceColumn(lineNumber: number): number;
	getAllOverviewRulerDecorations(theme: EditorTheme): IOverviewRulerDecorations;
	invalidateOverviewRulerColorCache(): void;
	invalidateMinimapColorCache(): void;
	getValueInRange(range: Range, eol: EndOfLinePreference): string;

	getModelLineMaxColumn(modelLineNumber: number): number;
	validateModelPosition(modelPosition: IPosition): Position;
	validateModelRange(range: IRange): Range;

	deduceModelPositionRelativeToViewPosition(viewAnchorPosition: Position, deltaOffset: number, lineFeedCnt: number): Position;
	getEOL(): string;
	getPlainTextToCopy(modelRanges: Range[], emptySelectionClipboard: boolean, forceCRLF: boolean): string | string[];
	getRichTextToCopy(modelRanges: Range[], emptySelectionClipboard: boolean): { html: string, mode: string } | null;

	//#region model

	pushStackElement(): void;

	//#endregion


	//#region cursor
	getPrimaryCursorState(): CursorState;
	getLastAddedCursorIndex(): number;
	getCursorStates(): CursorState[];
	setCursorStates(source: string | null | undefined, reason: CursorChangeReason, states: PartialCursorState[] | null): void;
	getCursorColumnSelectData(): IColumnSelectData;
	setCursorColumnSelectData(columnSelectData: IColumnSelectData): void;
	getPrevEditOperationType(): EditOperationType;
	setPrevEditOperationType(type: EditOperationType): void;
	revealPrimaryCursor(source: string | null | undefined, revealHorizontal: boolean): void;
	revealTopMostCursor(source: string | null | undefined): void;
	revealBottomMostCursor(source: string | null | undefined): void;
	revealRange(source: string | null | undefined, revealHorizontal: boolean, viewRange: Range, verticalType: VerticalRevealType, scrollType: ScrollType): void;
	//#endregion

	//#region viewLayout
	getVerticalOffsetForLineNumber(viewLineNumber: number): number;
	getScrollTop(): number;
	setScrollTop(newScrollTop: number, scrollType: ScrollType): void;
	//#endregion
}

export class MinimapLinesRenderingData {
	public readonly tabSize: number;
	public readonly data: Array<ViewLineData | null>;

	constructor(
		tabSize: number,
		data: Array<ViewLineData | null>
	) {
		this.tabSize = tabSize;
		this.data = data;
	}
}

export class ViewLineData {
	_viewLineDataBrand: void;

	/**
	 * The content at this view line.
	 */
	public readonly content: string;
	/**
	 * Does this line continue with a wrapped line?
	 */
	public readonly continuesWithWrappedLine: boolean;
	/**
	 * The minimum allowed column at this view line.
	 */
	public readonly minColumn: number;
	/**
	 * The maximum allowed column at this view line.
	 */
	public readonly maxColumn: number;
	/**
	 * The visible column at the start of the line (after the fauxIndent).
	 */
	public readonly startVisibleColumn: number;
	/**
	 * The tokens at this view line.
	 */
	public readonly tokens: IViewLineTokens;

	constructor(
		content: string,
		continuesWithWrappedLine: boolean,
		minColumn: number,
		maxColumn: number,
		startVisibleColumn: number,
		tokens: IViewLineTokens
	) {
		this.content = content;
		this.continuesWithWrappedLine = continuesWithWrappedLine;
		this.minColumn = minColumn;
		this.maxColumn = maxColumn;
		this.startVisibleColumn = startVisibleColumn;
		this.tokens = tokens;
	}
}

export class ViewLineRenderingData {
	/**
	 * The minimum allowed column at this view line.
	 */
	public readonly minColumn: number;
	/**
	 * The maximum allowed column at this view line.
	 */
	public readonly maxColumn: number;
	/**
	 * The content at this view line.
	 */
	public readonly content: string;
	/**
	 * Does this line continue with a wrapped line?
	 */
	public readonly continuesWithWrappedLine: boolean;
	/**
	 * Describes if `content` contains RTL characters.
	 */
	public readonly containsRTL: boolean;
	/**
	 * Describes if `content` contains non basic ASCII chars.
	 */
	public readonly isBasicASCII: boolean;
	/**
	 * The tokens at this view line.
	 */
	public readonly tokens: IViewLineTokens;
	/**
	 * Inline decorations at this view line.
	 */
	public readonly inlineDecorations: InlineDecoration[];
	/**
	 * The tab size for this view model.
	 */
	public readonly tabSize: number;
	/**
	 * The visible column at the start of the line (after the fauxIndent)
	 */
	public readonly startVisibleColumn: number;

	constructor(
		minColumn: number,
		maxColumn: number,
		content: string,
		continuesWithWrappedLine: boolean,
		mightContainRTL: boolean,
		mightContainNonBasicASCII: boolean,
		tokens: IViewLineTokens,
		inlineDecorations: InlineDecoration[],
		tabSize: number,
		startVisibleColumn: number
	) {
		this.minColumn = minColumn;
		this.maxColumn = maxColumn;
		this.content = content;
		this.continuesWithWrappedLine = continuesWithWrappedLine;

		this.isBasicASCII = ViewLineRenderingData.isBasicASCII(content, mightContainNonBasicASCII);
		this.containsRTL = ViewLineRenderingData.containsRTL(content, this.isBasicASCII, mightContainRTL);

		this.tokens = tokens;
		this.inlineDecorations = inlineDecorations;
		this.tabSize = tabSize;
		this.startVisibleColumn = startVisibleColumn;
	}

	public static isBasicASCII(lineContent: string, mightContainNonBasicASCII: boolean): boolean {
		if (mightContainNonBasicASCII) {
			return strings.isBasicASCII(lineContent);
		}
		return true;
	}

	public static containsRTL(lineContent: string, isBasicASCII: boolean, mightContainRTL: boolean): boolean {
		if (!isBasicASCII && mightContainRTL) {
			return strings.containsRTL(lineContent);
		}
		return false;
	}
}

export const enum InlineDecorationType {
	Regular = 0,
	Before = 1,
	After = 2,
	RegularAffectingLetterSpacing = 3
}

export class InlineDecoration {
	constructor(
		public readonly range: Range,
		public readonly inlineClassName: string,
		public readonly type: InlineDecorationType
	) {
	}
}

export class ViewModelDecoration {
	_viewModelDecorationBrand: void;

	public readonly range: Range;
	public readonly options: IModelDecorationOptions;

	constructor(range: Range, options: IModelDecorationOptions) {
		this.range = range;
		this.options = options;
	}
}

/**
 * Decorations are encoded in a number array using the following scheme:
 *  - 3*i = lane
 *  - 3*i+1 = startLineNumber
 *  - 3*i+2 = endLineNumber
 */
export interface IOverviewRulerDecorations {
	[color: string]: number[];
}
