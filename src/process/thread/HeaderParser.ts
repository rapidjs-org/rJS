interface IQualityHeader {
    value: string;
    quality: number;
}


export class HeaderParser {
	public static qualitySyntax(value: string): string[] {
		if(!value) return [];

		const values: string[] = value.split(/,/g);
		return values
		.map((value: string) => {
			const valueParts: string[] = value.split(/;q=(?=[01]\.[0-9])/g);
			return {
				value: valueParts[0].trim(),
				quality: (valueParts.length > 1)
					? parseFloat(valueParts[1])
					: 1.0
			};
		})
		.filter((a: IQualityHeader) => a.quality > 0)
		.sort((a: IQualityHeader, b: IQualityHeader) => a.quality - b.quality)
		.sort((a: IQualityHeader, b: IQualityHeader) => {
			return (a.value.match(/\*/g) || []).length - (b.value.match(/\*/g) || []).length;
		})
		.map((a: IQualityHeader) => a.value);
	}
}