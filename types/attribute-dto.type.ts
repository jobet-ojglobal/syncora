
// Types matching our API Payload shape
interface AttributeValueOption {
  valueId: string;
  label: string;
  meta: { hexCode: string } | null;
}

interface AttributeGroup {
  attributeId: string;
  name: string;
  options: AttributeValueOption[];
}