import { Input } from "../ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { SearchIcon } from "lucide-react";
import { SpinnerCustom } from "./spinner";

interface SearchInputProps {
  searchQuery: string;
  placeholder?: string;
  hasLabel?: boolean;
  isLoading?: boolean;
  setSearchQuery: (query: string) => void;
}

const SearchInput = ({
  searchQuery,
  placeholder = "Type to search...",
  hasLabel,
  isLoading = false,
  setSearchQuery,
}: SearchInputProps) => {
  return (
      <Field>
        { hasLabel && <FieldLabel htmlFor="input-button-group">Search</FieldLabel>}
        <InputGroup >
          <InputGroupInput 
            id="input-button-group"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs"
          />
          <InputGroupAddon align="inline-start">
            <SearchIcon className="text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <InputGroupButton
                aria-label="Clear"
                title="Clear"
                variant="secondary"
                onClick={() => {
                  setSearchQuery("")
                }}
              >
              Clear
            </InputGroupButton>
            { isLoading && <SpinnerCustom /> }
          </InputGroupAddon>
        </InputGroup>
      </Field>
  );
};

export default SearchInput;